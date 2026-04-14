package com.shunkan.eikaiwa;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ExternalNavigation")
public class ExternalNavigationPlugin extends Plugin {

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        String packageName = call.getString("packageName");

        if (url == null || url.trim().isEmpty()) {
            call.reject("URL is required");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addCategory(Intent.CATEGORY_BROWSABLE);

            if (packageName != null && !packageName.trim().isEmpty()) {
                intent.setPackage(packageName);
            }

            getActivity().startActivity(intent);

            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (ActivityNotFoundException primaryError) {
            if (packageName != null && !packageName.trim().isEmpty()) {
                try {
                    Intent fallbackIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    fallbackIntent.addCategory(Intent.CATEGORY_BROWSABLE);
                    getActivity().startActivity(fallbackIntent);

                    JSObject result = new JSObject();
                    result.put("opened", true);
                    result.put("fallback", true);
                    call.resolve(result);
                    return;
                } catch (ActivityNotFoundException fallbackError) {
                    call.reject("No application available to open the URL", fallbackError);
                    return;
                }
            }

            call.reject("No application available to open the URL", primaryError);
        } catch (Exception error) {
            call.reject("Failed to open URL", error);
        }
    }
}
