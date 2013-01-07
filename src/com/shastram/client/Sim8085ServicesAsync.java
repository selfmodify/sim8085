package com.shastram.client;

import java.util.List;

import com.google.gwt.user.client.rpc.AsyncCallback;
import com.shastram.client.rpc.SaveFileData;

/**
 * The async counterpart of <code>GreetingService</code>.
 */
public interface Sim8085ServicesAsync {
    void getExampleNames(AsyncCallback<List<String>> callback);

    void getExampleSourceCode(String name, AsyncCallback<String> callback);

    void saveFile(SaveFileData saveFileData, AsyncCallback<String> callback);

    void getTicket(AsyncCallback<String> callback);
}
