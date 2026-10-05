package com.pedro.lingoflix;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.common.model.DownloadConditions;
import com.google.mlkit.common.model.RemoteModelManager;
import com.google.mlkit.nl.translate.TranslateLanguage;
import com.google.mlkit.nl.translate.TranslateRemoteModel;
import com.google.mlkit.nl.translate.Translation;
import com.google.mlkit.nl.translate.Translator;
import com.google.mlkit.nl.translate.TranslatorOptions;
import java.util.HashMap;
import java.util.Map;

// Tradução de palavras e frases no próprio aparelho com o ML Kit (o mesmo do
// Carboy): grátis, sem chave e offline depois que o modelo de cada idioma
// (~30 MB) é baixado. Os tradutores ficam abertos para os toques seguintes
// responderem na hora.
@CapacitorPlugin(name = "Tradutor")
public class Tradutor extends Plugin {

    private final Map<String, Translator> abertos = new HashMap<>();

    // "en" → TranslateLanguage.ENGLISH; null se o ML Kit não traduz o idioma
    private static String idioma(String codigo) {
        return codigo == null ? null : TranslateLanguage.fromLanguageTag(codigo.split("-")[0]);
    }

    private Translator tradutor(String de, String para) {
        String k = de + "|" + para;
        Translator t = abertos.get(k);
        if (t == null) {
            t = Translation.getClient(new TranslatorOptions.Builder().setSourceLanguage(de).setTargetLanguage(para).build());
            abertos.put(k, t);
        }
        return t;
    }

    // Lê "de" e "para" da chamada; rejeita se algum não for suportado.
    private String[] par(PluginCall call) {
        String de = idioma(call.getString("de"));
        String para = idioma(call.getString("para", "pt"));
        if (de == null || para == null) {
            call.reject("Idioma não suportado pelo tradutor do aparelho.", "nao_suportado");
            return null;
        }
        return new String[] { de, para };
    }

    // Os dois modelos do par já estão no aparelho?
    @PluginMethod
    public void estado(PluginCall call) {
        String[] p = par(call);
        if (p == null) return;
        RemoteModelManager gerente = RemoteModelManager.getInstance();
        Tasks.whenAllSuccess(
            gerente.isModelDownloaded(new TranslateRemoteModel.Builder(p[0]).build()),
            gerente.isModelDownloaded(new TranslateRemoteModel.Builder(p[1]).build())
        )
            .addOnSuccessListener(r -> {
                JSObject ret = new JSObject();
                ret.put("pronto", Boolean.TRUE.equals(r.get(0)) && Boolean.TRUE.equals(r.get(1)));
                call.resolve(ret);
            })
            .addOnFailureListener(e -> call.reject(e.getMessage(), "falha"));
    }

    // Baixa o que faltar do par (em qualquer rede).
    @PluginMethod
    public void baixar(PluginCall call) {
        String[] p = par(call);
        if (p == null) return;
        tradutor(p[0], p[1])
            .downloadModelIfNeeded(new DownloadConditions.Builder().build())
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(e -> call.reject("Não foi possível baixar o tradutor: " + e.getMessage(), "download"));
    }

    @PluginMethod
    public void traduzir(PluginCall call) {
        String texto = call.getString("texto", "");
        String[] p = par(call);
        if (p == null) return;
        Translator t = tradutor(p[0], p[1]);
        t
            .downloadModelIfNeeded(new DownloadConditions.Builder().build())
            .onSuccessTask(v -> t.translate(texto))
            .addOnSuccessListener(traducao -> {
                JSObject ret = new JSObject();
                ret.put("traducao", traducao);
                call.resolve(ret);
            })
            .addOnFailureListener(e -> call.reject("Falha na tradução: " + e.getMessage(), "falha"));
    }

    @Override
    protected void handleOnDestroy() {
        for (Translator t : abertos.values()) t.close();
        abertos.clear();
    }
}
