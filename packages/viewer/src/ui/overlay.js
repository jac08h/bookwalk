import { leatherFor, hsl } from "../scene/textures.js";

// 2D reading overlay: the library-card checkout skeuomorph (PLAN.md D20),
// replacing the quote-book spread this was ported from. Keeps the two-page
// book shell, the open/close animation, and fitType() so nothing scrolls.

function formatDate(d) {
  if (!d) return "";
  if (d.year && d.month && d.day) {
    return String(d.day).padStart(2, "0") + "/" + String(d.month).padStart(2, "0") + "/" + d.year;
  }
  if (d.month) {
    return String(d.month).padStart(2, "0") + "/" + d.year;
  }
  return String(d.year);
}

function dateLabel(entry) {
  if ("from" in entry) {
    return formatDate(entry.from) + " – " + formatDate(entry.to);
  }
  return formatDate(entry);
}

export function createOverlay(theme, els) {
  const {
    stageEl, bookEl, backdropEl, closeBtn, bookNavEl, bookPrevBtn, bookNextBtn,
    bookPosEl, pageFlow, headLeft, headRight, pagenoLeft, pagenoRight,
    captionTitle, captionAuthor,
  } = els;

  let currentBook = null;
  let onClosed = null;
  let siblings = [];
  let siblingIndex = 0;

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function stampsHtml(book) {
    if (!book.datesRead || book.datesRead.length === 0) {
      return '<div class="bw-stamp-box bw-stamp-empty"></div>';
    }
    return '<div class="bw-stamp-box">' +
      book.datesRead.map(function (d) {
        return '<span class="bw-stamp">' + escapeHtml(dateLabel(d)) + "</span>";
      }).join("") + "</div>";
  }

  function ratingHtml(book) {
    if (!book.rating) return "";
    const full = Math.floor(book.rating);
    const half = book.rating - full >= 0.5;
    let marks = "";
    for (let i = 0; i < full; i++) marks += "✦";
    if (half) marks += "✧";
    return '<div class="bw-rating">' + marks + "</div>";
  }

  function renderCard() {
    if (!currentBook) return;
    const book = currentBook;

    headLeft.textContent = book.author;
    headRight.textContent = book.title;
    pagenoLeft.textContent = "";
    pagenoRight.textContent = "";

    const left =
      '<div class="bw-card-left">' +
      '<div class="bw-card-title">' + escapeHtml(book.title) + "</div>" +
      '<div class="bw-card-author">' + escapeHtml(book.author) + "</div>" +
      (book.format ? '<div class="bw-card-format">' + escapeHtml(book.format) + "</div>" : "") +
      (book.readCount > 1 ? '<div class="bw-card-readcount">read ' + book.readCount + " times</div>" : "") +
      stampsHtml(book) +
      "</div>";

    const right =
      '<div class="bw-card-right">' +
      ratingHtml(book) +
      (book.review
        ? '<div class="bw-card-review">' + escapeHtml(book.review).replace(/\n/g, "<br>") + "</div>"
        : '<div class="bw-card-review bw-card-review-empty"></div>') +
      "</div>";

    pageFlow.innerHTML = left + right;
    fitType();
  }

  const FIT_MIN = 0.62;
  const FIT_MAX = 1.15;
  const FIT_STEP = 0.03;
  function fitType() {
    if (pageFlow.clientHeight <= 0) return;
    let size = FIT_MAX;
    pageFlow.style.fontSize = size + "rem";
    let guard = 0;
    while (overflows() && size > FIT_MIN && guard < 60) {
      size -= FIT_STEP;
      pageFlow.style.fontSize = size + "rem";
      guard += 1;
    }
  }

  function overflows() {
    return pageFlow.scrollHeight - pageFlow.clientHeight > 1;
  }

  function showBook(book) {
    currentBook = book;
    const c = leatherFor(theme, book);
    bookEl.style.setProperty("--bw-edge", hsl(c, -14));
    captionTitle.textContent = book.title;
    captionAuthor.textContent = book.author + (book.year ? " · " + book.year : "");
    renderCard();
    updateBookNav();
  }

  function open(book, closedCallback, siblingBooks) {
    siblings = Array.isArray(siblingBooks) && siblingBooks.length ? siblingBooks : [book];
    siblingIndex = Math.max(0, siblings.indexOf(book));
    onClosed = closedCallback || null;

    showBook(book);

    stageEl.hidden = false;
    stageEl.setAttribute("aria-hidden", "false");
    backdropEl.hidden = false;

    requestAnimationFrame(function () {
      backdropEl.classList.add("bw-visible");
      stageEl.classList.add("bw-open");
      fitType();
    });

    closeBtn.focus();
  }

  function flipBook(delta) {
    if (!currentBook || siblings.length < 2) return;
    const next = siblingIndex + delta;
    if (next < 0 || next >= siblings.length) return;
    siblingIndex = next;
    showBook(siblings[siblingIndex]);
  }

  function updateBookNav() {
    if (siblings.length > 1) {
      bookNavEl.hidden = false;
      bookPrevBtn.disabled = siblingIndex === 0;
      bookNextBtn.disabled = siblingIndex === siblings.length - 1;
      bookPosEl.textContent = (siblingIndex + 1) + " / " + siblings.length +
        (currentBook.year ? " · " + currentBook.year : "");
    } else {
      bookNavEl.hidden = true;
    }
  }

  function close() {
    if (!currentBook) return;
    stageEl.classList.remove("bw-open");
    backdropEl.classList.remove("bw-visible");

    window.setTimeout(function () {
      stageEl.hidden = true;
      stageEl.setAttribute("aria-hidden", "true");
      backdropEl.hidden = true;
      currentBook = null;
      if (onClosed) {
        const cb = onClosed;
        onClosed = null;
        cb();
      }
    }, 420);
  }

  bookPrevBtn.addEventListener("click", function () {
    flipBook(-1);
  });
  bookNextBtn.addEventListener("click", function () {
    flipBook(1);
  });
  closeBtn.addEventListener("click", close);
  backdropEl.addEventListener("click", close);

  const onResize = function () {
    if (currentBook) fitType();
  };
  window.addEventListener("resize", onResize);

  const onKeydown = function (event) {
    if (!currentBook) return;
    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      flipBook(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      flipBook(1);
    }
  };
  document.addEventListener("keydown", onKeydown);

  return {
    open: open,
    close: close,
    isOpen: function () {
      return currentBook !== null;
    },
    destroy: function () {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKeydown);
    },
  };
}
