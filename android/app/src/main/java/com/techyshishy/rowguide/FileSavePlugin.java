package com.techyshishy.rowguide;

import android.Manifest;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

/**
 * Capacitor plugin that saves a base64-encoded file directly to the
 * device's Downloads folder, bypassing the share sheet.
 *
 * On Android 10+ (API 29+): uses MediaStore.Downloads — no storage
 * permissions required.
 *
 * On Android 9 and below (API 28-): writes to the public Downloads
 * directory via the legacy filesystem API and triggers a MediaScanner
 * scan so the file appears immediately in the Files app. Requests
 * WRITE_EXTERNAL_STORAGE at runtime if not already granted (API 23–28).
 */
@CapacitorPlugin(
    name = "FileSave",
    permissions = {
        @Permission(
            strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE },
            alias = "storage"
        )
    }
)
public class FileSavePlugin extends Plugin {

    /**
     * Save a file to the Downloads folder.
     *
     * <p>Call options:
     * <ul>
     *   <li>filename  (String, required) — target file name, e.g. "my-project.rgp"
     *   <li>mimeType  (String, required) — MIME type, e.g. "application/octet-stream"
     *   <li>data      (String, required) — base64-encoded file contents (no data-URI prefix)
     * </ul>
     *
     * <p>Resolves with:
     * <ul>
     *   <li>uri   (String) — content:// or file:// URI of the saved file
     *   <li>path  (String) — human-readable path shown to the user
     * </ul>
     */
    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String filename = call.getString("filename");
        if (filename == null || filename.isEmpty()) {
            call.reject("filename is required");
            return;
        }
        if (filename.contains("/") || filename.contains("..")) {
            call.reject("Invalid filename");
            return;
        }

        String mimeType = call.getString("mimeType");
        if (mimeType == null || mimeType.isEmpty()) {
            mimeType = "application/octet-stream";
        }

        String data = call.getString("data");
        if (data == null || data.isEmpty()) {
            call.reject("data is required");
            return;
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(data, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid base64 data: " + e.getMessage());
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveViaMediaStore(call, filename, mimeType, bytes);
            } else {
                if (getPermissionState("storage") != PermissionState.GRANTED) {
                    requestPermissionForAlias("storage", call, "storagePermissionCallback");
                    return;
                }
                saveViaLegacyFilesystem(call, filename, mimeType, bytes);
            }
        } catch (Exception e) {
            call.reject("Failed to save file: " + e.getMessage());
        }
    }

    /**
     * Invoked after the user responds to the WRITE_EXTERNAL_STORAGE runtime
     * permission prompt. Re-executes the legacy download path on grant, or
     * rejects the call on denial.
     */
    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        if (getPermissionState("storage") != PermissionState.GRANTED) {
            call.reject("Storage permission denied — cannot save to Downloads on Android 9 and below");
            return;
        }

        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType");
        if (mimeType == null || mimeType.isEmpty()) {
            mimeType = "application/octet-stream";
        }
        String data = call.getString("data");

        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            saveViaLegacyFilesystem(call, filename, mimeType, bytes);
        } catch (Exception e) {
            call.reject("Failed to save file: " + e.getMessage());
        }
    }

    private void saveViaMediaStore(
            PluginCall call,
            String filename,
            String mimeType,
            byte[] bytes) throws Exception {

        android.content.ContentResolver resolver = getContext().getContentResolver();

        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
        values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
        values.put(MediaStore.Downloads.IS_PENDING, 1);

        Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        Uri uri = resolver.insert(collection, values);
        if (uri == null) {
            call.reject("Failed to create MediaStore entry for " + filename);
            return;
        }

        boolean success = false;
        try (OutputStream stream = resolver.openOutputStream(uri)) {
            if (stream == null) throw new IOException("openOutputStream returned null");
            stream.write(bytes);
            success = true;
        } finally {
            if (!success) {
                resolver.delete(uri, null, null);
                call.reject("Failed to write file to Downloads");
                return;
            }
        }

        values.clear();
        values.put(MediaStore.Downloads.IS_PENDING, 0);
        resolver.update(uri, values, null, null);

        JSObject result = new JSObject();
        result.put("uri", uri.toString());
        result.put("path", "Downloads/" + filename);
        call.resolve(result);
    }

    private void saveViaLegacyFilesystem(
            PluginCall call,
            String filename,
            String mimeType,
            byte[] bytes) throws Exception {

        File downloadsDir =
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!downloadsDir.exists()) {
            downloadsDir.mkdirs();
        }

        File file = new File(downloadsDir, filename);
        try (FileOutputStream stream = new FileOutputStream(file)) {
            stream.write(bytes);
        }

        MediaScannerConnection.scanFile(
                getContext(),
                new String[]{file.getAbsolutePath()},
                new String[]{mimeType},
                null);

        JSObject result = new JSObject();
        result.put("uri", file.toURI().toString());
        result.put("path", file.getAbsolutePath());
        call.resolve(result);
    }
}
