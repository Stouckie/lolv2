// Helpers "sauver/ouvrir" un fichier JSON côté client.
// Utilise la File System Access API si dispo, sinon fallback en download / input file.

export async function saveJsonFile(defaultName: string, data: any): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  try {
    if ("showSaveFilePicker" in window) {
      // @ts-ignore experimental
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: defaultName,
        types: [{ description: "LoL Manager Save", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([json], { type: "application/json" }));
      await writable.close();
      return;
    }
  } catch (e) {
    console.warn("[fs.saveJsonFile] picker failed, fallback to download:", e);
  }
  // Fallback: download direct
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function openJsonFile<T = any>(): Promise<T | null> {
  try {
    if ("showOpenFilePicker" in window) {
      // @ts-ignore experimental
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ description: "LoL Manager Save", accept: { "application/json": [".json"] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      return JSON.parse(text) as T;
    }
  } catch (e) {
    console.warn("[fs.openJsonFile] picker failed, fallback to <input type=file>:", e);
  }
  // Fallback: input invisible
  return new Promise<T | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const text = await f.text();
      try {
        resolve(JSON.parse(text) as T);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}
