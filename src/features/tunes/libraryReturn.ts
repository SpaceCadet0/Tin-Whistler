/**
 * Where "Back" on a tune page returns to: the library with the filters it was left with
 * (they live in the URL's query string). Kept in memory only, like browser history.
 */
let lastSearch = ''

export const rememberLibrarySearch = (search: string): void => {
  lastSearch = search
}

export const libraryPath = (): string => `/tunes${lastSearch}`
