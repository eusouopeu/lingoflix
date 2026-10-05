package com.pedro.lingoflix;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // plugins locais (abre o título no app do streaming; tradutor do
        // aparelho com ML Kit): registrar antes do super
        registerPlugin(AbrirNoApp.class);
        registerPlugin(Tradutor.class);
        super.onCreate(savedInstanceState);
    }
}
