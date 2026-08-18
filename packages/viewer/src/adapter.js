// Adapts @bw/manifest's Book shape to the internal shape the ported renderer
// expects (author, year, spine_seed) — see viewer-port.md §2.
export function adaptBook(book) {
  return {
    id: book.id,
    author: book.authors[0] || "Unknown",
    title: book.title,
    year: book.yearRead ?? null,
    hue: book.hue,
    spine_seed: book.spineSeed,
    format: book.format,
    status: book.status,
    datesRead: book.datesRead,
    readCount: book.readCount,
    rating: book.rating,
    review: book.review,
  };
}

// Builds the groups[] the scene consumes: one group per layout key, ordered
// newest-first per PLAN.md D14. Statuses route to fixed extra groups per
// manifest-schema.md §2.4: to-read near the entrance, currently-reading on
// the reading table, undated read books on a labelled far-end shelf face.
export function buildGroups(manifest) {
  const adapted = manifest.books.map(adaptBook);
  const byYear = new Map();
  const toRead = [];
  const currentlyReading = [];
  const undated = [];

  for (const book of adapted) {
    if (book.status === "to-read") {
      toRead.push(book);
      continue;
    }
    if (book.status === "currently-reading") {
      currentlyReading.push(book);
      continue;
    }
    if (book.year === null || book.year === undefined) {
      undated.push(book);
      continue;
    }
    if (!byYear.has(book.year)) byYear.set(book.year, []);
    byYear.get(book.year).push(book);
  }

  const sortBooks = (list) =>
    list.slice().sort((a, b) => {
      const authorCmp = a.author.toLowerCase().localeCompare(b.author.toLowerCase());
      return authorCmp !== 0 ? authorCmp : a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    });

  const years = Array.from(byYear.keys()).sort((a, b) => b - a);
  const groups = years.map((year) => ({
    key: String(year), label: String(year), kind: "year", books: sortBooks(byYear.get(year)),
  }));

  if (undated.length > 0) {
    groups.push({ key: "undated", label: "", kind: "undated", books: sortBooks(undated) });
  }
  if (toRead.length > 0) {
    groups.push({ key: "to-read", label: "TO READ", kind: "to-read", books: sortBooks(toRead) });
  }

  return { groups, currentlyReading: sortBooks(currentlyReading) };
}
