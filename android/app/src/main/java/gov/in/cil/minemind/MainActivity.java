package gov.in.cil.minemind;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebStorage;
import androidx.activity.result.ActivityResult;
import androidx.annotation.Keep;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_RECORD_AUDIO = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeGoogleAuthPlugin.class);
        registerPlugin(GoogleAuthFixPlugin.class);
        super.onCreate(savedInstanceState);

        // Ensure microphone audio recording permissions are requested on launch if not already granted
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[]{
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS
                },
                PERMISSION_REQUEST_RECORD_AUDIO
            );
        }
    }

    @CapacitorPlugin(name = "NativeGoogleAuth")
    public static class NativeGoogleAuthPlugin extends Plugin {

        @PluginMethod
        public void chooseAccount(PluginCall call) {
            try {
                Intent intent = AccountManager.newChooseAccountIntent(
                    null,
                    (List<Account>) null,
                    new String[]{"com.google"},
                    null,
                    null,
                    null,
                    null
                );
                startActivityForResult(call, intent, "chooseAccountResult");
            } catch (Exception e) {
                call.reject("Failed to open Android account chooser: " + e.getMessage());
            }
        }

        @ActivityCallback
        private void chooseAccountResult(PluginCall call, ActivityResult result) {
            if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                String accountName = result.getData().getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
                if (accountName != null && !accountName.trim().isEmpty()) {
                    JSObject ret = new JSObject();
                    ret.put("email", accountName.trim());
                    call.resolve(ret);
                    return;
                }
            }
            call.reject("Account selection cancelled");
        }
    }

    @CapacitorPlugin(name = "GoogleAuthFix")
    public static class GoogleAuthFixPlugin extends Plugin {
        @PluginMethod
        @Keep
        @SuppressWarnings("unused")
        public void clearGoogleCookies(PluginCall call) {
            getBridge().executeOnMainThread(() -> {
                try {
                    CookieManager cookieManager = CookieManager.getInstance();
                    cookieManager.removeAllCookies(value -> {
                        cookieManager.flush();
                        WebStorage.getInstance().deleteAllData();
                        call.resolve();
                    });
                } catch (Exception e) {
                    call.reject("Failed to clear cookies: " + e.getMessage());
                }
            });
        }
    }
}

