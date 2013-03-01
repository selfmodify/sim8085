package com.shastram.server;

import java.util.Arrays;
import java.util.List;
import java.util.logging.Logger;

import com.google.gwt.user.server.rpc.RemoteServiceServlet;
import com.shastram.client.Sim8085Services;
import com.shastram.client.rpc.SaveFileData;
import com.shastram.server.BoxNetData.BoxNetFileUploadResponse;
import com.shastram.test.TestInstructions;

/**
 * The server side implementation of the RPC service.
 */
@SuppressWarnings("serial")
public class Sim8085ServicesImpl extends RemoteServiceServlet implements Sim8085Services {

    private static Logger logger = Logger.getLogger(Sim8085ServicesImpl.class.getName());

    private static final long serialVersionUID = 6343983694137057114L;

    // private static BoxNetService boxNetService = new BoxNetService();

    @Override
    public List<String> getExampleNames() {
        List<String> list = Arrays.asList(TestInstructions.getTestNames());
        return list;
    }

    @Override
    public String getTicket() throws Exception {
        // BoxNetData.BoxNetTicketResponse newTicket =
        // boxNetService.getNewTicket();
        // return newTicket.getTicket();
        return null;
    }

    @Override
    public String saveFile(SaveFileData saveFileData) {
        BoxNetService service = new BoxNetService();
        BoxNetFileUploadResponse response = service.saveFileToBoxNet(saveFileData);
        String str = response.exception != null ? response.exception.getMessage() : response.entries.get(0).message;
        return str;
    }
}
