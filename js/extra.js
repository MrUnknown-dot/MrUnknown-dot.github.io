import { authGuard, initTranslatorOverlay, registerServiceWorker, setBottomNavActive } from "./common.js";

registerServiceWorker();
setBottomNavActive();
initTranslatorOverlay();

const profileImg = document.getElementById("profileImg");
const BOOK_PROGRESS_PREFIX = "lingoleap_book_progress_v1";
const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.mjs";
const PDFJS_WORKER_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.mjs";
let pdfjsLibPromise = null;

function setProfileImage(photoURL) {
  if (!profileImg) return;

  profileImg.onerror = () => {
    profileImg.onerror = null;
    profileImg.src = "./assets/avatar.svg";
  };

  profileImg.src = photoURL || "./assets/avatar.svg";
}

function getProgressKey(uid, bookId) {
  return `${BOOK_PROGRESS_PREFIX}_${uid}_${bookId}`;
}

function getSavedPage(uid, bookId) {
  const parsed = Number(localStorage.getItem(getProgressKey(uid, bookId)));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function savePage(uid, bookId, page) {
  localStorage.setItem(getProgressKey(uid, bookId), String(page));
}

function extractGoogleDriveFileId(rawUrl = "") {
  if (!rawUrl) return "";

  try {
    const parsed = new URL(rawUrl, window.location.href);
    if (!parsed.hostname.includes("drive.google.com")) return "";
    const directId = parsed.searchParams.get("id");
    if (directId) return directId;

    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
    return match?.[1] || "";
  } catch (_) {
    const match = rawUrl.match(/[?&]id=([^&#]+)/i) || rawUrl.match(/\/file\/d\/([^/]+)/i);
    return match?.[1] || "";
  }
}

function normalizeBookUrlForReader(rawUrl = "") {
  const fileId = extractGoogleDriveFileId(rawUrl);
  if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;
  return rawUrl;
}

function canControlPageInFallback(rawUrl = "") {
  return !extractGoogleDriveFileId(rawUrl);
}

function buildFallbackViewerUrl(rawUrl = "", page = 1, forceToken = "") {
  const fileId = extractGoogleDriveFileId(rawUrl);
  if (fileId) {
    const directPdfUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    return `https://docs.google.com/gview?url=${encodeURIComponent(directPdfUrl)}&embedded=true`;
  }
  return withPage(rawUrl, page, forceToken);
}

function withPage(url, page, forceToken = "") {
  if (!url) return "";
  const cleanUrl = url.split("#")[0];
  if (!canControlPageInFallback(cleanUrl)) return cleanUrl;
  let finalUrl = cleanUrl;

  try {
    const parsed = new URL(cleanUrl);
    parsed.searchParams.set("page", String(page));
    if (forceToken) parsed.searchParams.set("_lrp", forceToken);
    finalUrl = parsed.toString();
  } catch (_) {
    const join = cleanUrl.includes("?") ? "&" : "?";
    finalUrl = `${cleanUrl}${join}page=${page}${forceToken ? `&_lrp=${encodeURIComponent(forceToken)}` : ""}`;
  }

  return `${finalUrl}#page=${page}&view=FitH&pagemode=none&navpanes=0`;
}

function isCrossOriginUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl, window.location.href);
    return parsed.origin !== window.location.origin;
  } catch (_) {
    return false;
  }
}

async function loadPdfJs() {
  if (pdfjsLibPromise) return pdfjsLibPromise;
  pdfjsLibPromise = import(PDFJS_CDN).then((pdfjsLib) => {
    if (pdfjsLib?.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
    }
    return pdfjsLib;
  });
  return pdfjsLibPromise;
}

function createBookReaderOverlay() {
  const existing = document.getElementById("bookReaderOverlay");
  if (existing) return existing;

  const overlay = document.createElement("div");
  overlay.id = "bookReaderOverlay";
  overlay.className = "book-reader-overlay";
  overlay.innerHTML = `
    <div class="book-reader-modal" role="dialog" aria-modal="true" aria-label="Book Reader">
      <div class="book-reader-header">
        <h3 id="bookReaderTitle" class="section-title" style="margin:0;">Book Reader</h3>
        <button id="closeBookReaderBtn" class="btn btn-outline" type="button" style="width:auto;padding:10px 14px;">Close</button>
      </div>
      <p id="bookReaderStatus" class="muted" style="margin:8px 0 12px;">Loading...</p>
      <div class="book-reader-frame-wrap">
        <canvas id="bookReaderCanvas" aria-label="Book page"></canvas>
        <iframe id="bookReaderFallbackFrame" title="Book Reader Fallback" loading="lazy" style="display:none;"></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  return overlay;
}

function initYoutubeEmbeds() {
  const frames = Array.from(document.querySelectorAll(".js-youtube-embed"));
  if (!frames.length) return;

  const applyNetworkState = () => {
    const online = navigator.onLine;
    frames.forEach((frame) => {
      const wrap = frame.closest(".list-item");
      const note = wrap ? wrap.querySelector(".js-video-offline-note") : null;
      if (online) {
        const src = frame.dataset.youtubeSrc || "";
        if (src && frame.src !== src) frame.src = src;
        if (note) note.style.display = "none";
      } else {
        frame.removeAttribute("src");
        if (note) note.style.display = "block";
      }
    });
  };

  applyNetworkState();
  window.addEventListener("online", applyNetworkState);
  window.addEventListener("offline", applyNetworkState);
}

function initBookReader(uid) {
  const overlay = createBookReaderOverlay();
  const canvas = document.getElementById("bookReaderCanvas");
  const fallbackFrame = document.getElementById("bookReaderFallbackFrame");
  const titleEl = document.getElementById("bookReaderTitle");
  const statusEl = document.getElementById("bookReaderStatus");
  const prevBtn = document.getElementById("prevBookPageBtn");
  const nextBtn = document.getElementById("nextBookPageBtn");
  const closeBtn = document.getElementById("closeBookReaderBtn");
  const canvasWrap = canvas.parentElement;
  const ctx = canvas.getContext("2d");

  let activeBookId = "";
  let activeBookUrl = "";
  let currentPage = 1;
  let totalPages = 0;
  let configuredTotalPages = 0;
  let activePdfDoc = null;
  let rendering = false;
  let renderSeq = 0;
  let usingFallback = false;
  let fallbackCanPaginate = false;

  function updateControls() {
    if (usingFallback) {
      if (!fallbackCanPaginate) {
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
      }
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = configuredTotalPages > 0 ? currentPage >= configuredTotalPages : false;
      return;
    }

    const hasPdf = !!activePdfDoc;
    if (prevBtn) prevBtn.disabled = !hasPdf || currentPage <= 1 || rendering;
    if (nextBtn) nextBtn.disabled = !hasPdf || currentPage >= totalPages || rendering;
  }

  function updateStatus(text = "") {
    if (text) {
      statusEl.textContent = text;
      return;
    }

    if (!activeBookUrl) {
      statusEl.textContent = "This book does not have an in-app PDF URL configured yet.";
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      ctx.clearRect(0, 0, canvas.width || 1, canvas.height || 1);
      canvas.style.display = "block";
      fallbackFrame.style.display = "none";
      return;
    }

    if (!activePdfDoc) {
      statusEl.textContent = "Loading book...";
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    statusEl.textContent = `Page ${currentPage} / ${totalPages}`;
    updateControls();
  }

  function getRenderScale(page) {
    const unscaledViewport = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(280, canvasWrap.clientWidth - 2);
    return availableWidth / unscaledViewport.width;
  }

  async function renderCurrentPage() {
    if (usingFallback) {
      const targetUrl = fallbackCanPaginate
        ? withPage(activeBookUrl, currentPage, `${Date.now()}-${currentPage}`)
        : buildFallbackViewerUrl(activeBookUrl, currentPage, `${Date.now()}-${currentPage}`);
      fallbackFrame.src = "about:blank";
      requestAnimationFrame(() => {
        fallbackFrame.src = targetUrl;
      });
      if (!fallbackCanPaginate) {
        statusEl.textContent = "Use the built-in controls in the reader for navigation.";
      } else if (configuredTotalPages > 0) {
        statusEl.textContent = `Page ${currentPage} / ${configuredTotalPages}`;
      } else {
        statusEl.textContent = `Page ${currentPage} / ?`;
      }
      updateControls();
      if (fallbackCanPaginate) {
        savePage(uid, activeBookId, currentPage);
      }
      return;
    }

    if (!activePdfDoc || rendering) return;
    canvas.style.display = "block";
    fallbackFrame.style.display = "none";
    rendering = true;
    updateControls();
    updateStatus(`Rendering page ${currentPage} / ${totalPages}...`);

    const mySeq = ++renderSeq;
    try {
      const page = await activePdfDoc.getPage(currentPage);
      if (mySeq !== renderSeq) return;

      const viewport = page.getViewport({ scale: getRenderScale(page) });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = "100%";
      canvas.style.height = "auto";

      await page.render({
        canvasContext: ctx,
        viewport
      }).promise;

      savePage(uid, activeBookId, currentPage);
      updateStatus();
    } catch (error) {
      console.error("Error rendering PDF page:", error);
      updateStatus("Unable to render this page.");
    } finally {
      rendering = false;
      updateControls();
    }
  }

  async function loadBookDocument(bookUrl) {
    const cleanUrl = bookUrl.split("#")[0];

    if (isCrossOriginUrl(cleanUrl)) {
      // Many public PDF hosts block JS fetch via CORS; use iframe fallback directly.
      activePdfDoc = null;
      totalPages = 0;
      usingFallback = true;
      fallbackCanPaginate = canControlPageInFallback(activeBookUrl);
      canvas.style.display = "none";
      fallbackFrame.style.display = "block";
      fallbackFrame.src = buildFallbackViewerUrl(activeBookUrl, currentPage, `open-${Date.now()}`);
      updateStatus(
        fallbackCanPaginate
          ? `Page ${currentPage} / ${configuredTotalPages > 0 ? configuredTotalPages : "?"}`
          : "Use the built-in controls in the reader for navigation."
      );
      updateControls();
      return;
    }

    try {
      updateStatus("Loading book...");
      const pdfjsLib = await loadPdfJs();
      const task = pdfjsLib.getDocument(cleanUrl);
      activePdfDoc = await task.promise;
      usingFallback = false;
      totalPages = activePdfDoc.numPages || 1;
      configuredTotalPages = totalPages;
      currentPage = Math.min(Math.max(1, currentPage), totalPages);
      await renderCurrentPage();
    } catch (error) {
      console.error("Error loading PDF:", error);
      activePdfDoc = null;
      totalPages = 0;
      usingFallback = true;
      fallbackCanPaginate = canControlPageInFallback(activeBookUrl);
      canvas.style.display = "none";
      fallbackFrame.style.display = "block";
      fallbackFrame.src = buildFallbackViewerUrl(activeBookUrl, currentPage, `open-${Date.now()}`);
      updateStatus(
        fallbackCanPaginate
          ? `Page ${currentPage} / ${configuredTotalPages > 0 ? configuredTotalPages : "?"}`
          : "Use the built-in controls in the reader for navigation."
      );
      updateControls();
    }
  }

  function closeReader() {
    overlay.classList.remove("active");
  }

  function openReader(bookId, bookTitle, bookUrl, bookPages) {
    activeBookId = bookId;
    activeBookUrl = normalizeBookUrlForReader(bookUrl);
    currentPage = getSavedPage(uid, bookId);
    configuredTotalPages = Number(bookPages) > 0 ? Number(bookPages) : 0;
    if (configuredTotalPages > 0) {
      currentPage = Math.min(currentPage, configuredTotalPages);
    }
    totalPages = 0;
    activePdfDoc = null;
    usingFallback = false;

    titleEl.textContent = bookTitle;
    overlay.classList.add("active");
    if (!activeBookUrl) {
      updateStatus();
      return;
    }
    loadBookDocument(activeBookUrl);
  }

  closeBtn.addEventListener("click", closeReader);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeReader();
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", async () => {
      if (currentPage <= 1 || rendering) return;
      if (!activePdfDoc && !usingFallback) return;
      currentPage -= 1;
      await renderCurrentPage();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", async () => {
      if (!activeBookId || !activeBookUrl || rendering) return;
      if (!activePdfDoc && !usingFallback) return;
      if (!usingFallback && currentPage >= totalPages) return;
      if (usingFallback && configuredTotalPages > 0 && currentPage >= configuredTotalPages) return;

      currentPage += 1;
      await renderCurrentPage();
    });
  }

  window.addEventListener("resize", () => {
    if (!overlay.classList.contains("active")) return;
    if (!activePdfDoc || rendering) return;
    renderCurrentPage();
  });

  document.querySelectorAll(".js-book-link").forEach((bookLink) => {
    bookLink.addEventListener("click", (event) => {
      event.preventDefault();
      const bookId = bookLink.dataset.bookId;
      const bookTitle = bookLink.dataset.bookTitle || "Book Reader";
      const bookUrl = bookLink.dataset.bookUrl || "";
      const bookPages = bookLink.dataset.bookPages || "";

      openReader(bookId, bookTitle, bookUrl, bookPages);
    });
  });
}

authGuard((user, userData) => {
  setProfileImage(userData.photoURL || user.photoURL);
  initYoutubeEmbeds();

  const tips = [
    "Speak slowly and finish complete sentences.",
    "Record yourself and compare with native speakers.",
    "Use 3 new words every day in conversation.",
    "Listen first, then repeat with matching tone."
  ];

  const tipList = document.getElementById("tipsList");
  tipList.innerHTML = "";
  tips.forEach((tip, idx) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.textContent = `${idx + 1}. ${tip}`;
    tipList.appendChild(item);
  });

  initBookReader(user.uid);
});
