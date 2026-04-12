import { registerPlugin } from '@capacitor/core';

export interface FileSavePlugin {
  /**
   * Save a base64-encoded file directly to the device's Downloads folder.
   * Android only — on other platforms this method will not be called.
   *
   * @param options.filename - Target file name, e.g. "my-project.rgp"
   * @param options.mimeType - MIME type, e.g. "application/octet-stream"
   * @param options.data     - Base64-encoded file contents (no data-URI prefix)
   * @returns uri  — content:// or file:// URI of the saved file
   *          path — human-readable path shown to the user
   */
  saveToDownloads(options: {
    filename: string;
    mimeType: string;
    data: string;
  }): Promise<{ uri: string; path: string }>;
}

export const FileSave = registerPlugin<FileSavePlugin>('FileSave');
