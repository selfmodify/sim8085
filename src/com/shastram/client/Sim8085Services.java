package com.shastram.client;

import java.util.List;

import com.google.gwt.user.client.rpc.RemoteService;
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath;
import com.shastram.client.rpc.SaveFileData;

/**
 * The client side stub for the RPC service.
 */
@RemoteServiceRelativePath("services")
public interface Sim8085Services extends RemoteService {

    /**
     * Get the names of all the examples
     */
    List<String> getExampleNames();

    String saveFile(SaveFileData saveFileData);

    String getTicket() throws Exception;
}
