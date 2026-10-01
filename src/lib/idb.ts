/** Tiny promise wrapper around one IndexedDB object store (no dependency). */
export class KeyValueStore<T> {
  private db: Promise<IDBDatabase> | null = null

  private dbName: string
  private storeName: string

  constructor(dbName: string, storeName: string) {
    this.dbName = dbName
    this.storeName = storeName
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(this.storeName)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    return this.db
  }

  private async run<R>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<R>): Promise<R> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode)
      const req = fn(tx.objectStore(this.storeName))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  get(key: string): Promise<T | undefined> {
    return this.run('readonly', (s) => s.get(key) as IDBRequest<T | undefined>)
  }

  set(key: string, value: T): Promise<IDBValidKey> {
    return this.run('readwrite', (s) => s.put(value, key))
  }

  delete(key: string): Promise<undefined> {
    return this.run('readwrite', (s) => s.delete(key))
  }

  values(): Promise<T[]> {
    return this.run('readonly', (s) => s.getAll() as IDBRequest<T[]>)
  }
}
