package com.pedro.lingoflix;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // plugin local (abre o título no app do streaming): registrar antes do super
        registerPlugin(AbrirNoApp.class);
        super.onCreate(savedInstanceState);
    }
}
