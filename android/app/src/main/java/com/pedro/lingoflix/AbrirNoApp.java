package com.pedro.lingoflix;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Abre o link de um título direto no app do streaming: a URL vai num
// ACTION_VIEW preso ao pacote do app (sem isso o Android pode escolher o
// navegador). Se o app não abrir esse link, abre o app na tela inicial.
// Devolve onde abriu: "titulo", "app" ou "nenhum" (o JS cai para o site).
@CapacitorPlugin(name = "AbrirNoApp")
public class AbrirNoApp extends Plugin {

    @PluginMethod
    public void abrir(PluginCall call) {
        String url = call.getString("url");
        String pacote = call.getString("pacote");
        JSObject ret = new JSObject();
        if (pacote == null) {
            call.reject("pacote obrigatório");
            return;
        }
        if (url != null) {
            Intent ver = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            ver.setPackage(pacote);
            ver.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getActivity().startActivity(ver);
                ret.put("aberto", "titulo");
                call.resolve(ret);
                return;
            } catch (ActivityNotFoundException ignorado) {
                // app ausente ou sem tratar esse link: tenta a tela inicial
            }
        }
        Intent inicio = getContext().getPackageManager().getLaunchIntentForPackage(pacote);
        if (inicio != null) {
            inicio.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getActivity().startActivity(inicio);
                ret.put("aberto", "app");
                call.resolve(ret);
                return;
            } catch (ActivityNotFoundException ignorado) {
                // segue para "nenhum"
            }
        }
        ret.put("aberto", "nenhum");
        call.resolve(ret);
    }
}
