package com.shastram.server;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.StringReader;
import java.util.logging.Logger;

import junit.framework.TestCase;

import org.apache.commons.io.FileUtils;
import org.apache.http.entity.mime.HttpMultipartMode;
import org.apache.http.entity.mime.MultipartEntity;
import org.apache.http.entity.mime.content.ByteArrayBody;
import org.apache.http.entity.mime.content.StringBody;

import com.shastram.client.rpc.SaveFileData;
import com.shastram.server.BoxNetData.BoxNetFileUploadResponse;

public class TestBoxNetService extends TestCase {

    private static Logger logger = Logger.getLogger(TestBoxNetService.class.getName());

    public void testBoxExchange() throws Exception {
        BoxNetService boxNet = mock(BoxNetService.class);
        // read the error response data
        String errorResponse = FileUtils.readFileToString(
                new File("box-net-file-upload-error-response.txt"));
        // read the error response data
        String successResponse = FileUtils.readFileToString(
                new File("box-net-file-upload-response.txt"));
        SaveFileData saveFileData =
                new SaveFileData("s7q6hkklutef9ex5jxk4z0kj7bkgcjq6",
                        "noname-1.85",
                        "3011590059",
                        "This is test data.3");
        when(boxNet.getFileUploadResponse(saveFileData))
        .thenReturn(errorResponse, successResponse);
        BoxNetData.BoxNetFileUploadResponse response = boxNet.saveFileToBoxNet(saveFileData);
        assertNotNull(response);
        assertTrue("At least one entry for the uploaded file must exist",
                response.total_count > 1);
        assertNull("Error status must be null", response.entries.get(0).status);
    }

    /**
     * Test box.net ticket response parsing.
     * @throws Exception
     */
    public void testBoxNetTicketResponseParsing() throws Exception {
        Object response = BoxNetService.readXml(new StringReader("<response>\n"
                + "<status>get_ticket_ok</status>\n"
                + "<ticket>bxquuv025araaaaaze2n4md9zef95e8</ticket>\n"
                + "</response>"), BoxNetData.BoxNetTicketResponse.class);
        assertNotNull(response);
    }

    /**
     * Test file upload response.
     * @throws IOException 
     */
    public void testBoxNetFileUploadResponseParsing() throws IOException {
        BoxNetData.BoxNetFileUploadResponse readValue =
                BoxNetService.jsonReader.readValue(new File("box-net-file-upload-response.txt"),
                        BoxNetData.BoxNetFileUploadResponse.class);
        assertNotNull(readValue);
    }

    public void testBoxNetFileUploadErrorResponseParsing() throws IOException {
        BoxNetData.BoxNetFileUploadResponse readValue =
                BoxNetService.jsonReader.readValue(new File("box-net-file-upload-error-response.txt"),
                        BoxNetData.BoxNetFileUploadResponse.class);
        assertNotNull(readValue);
    }

    /**
     * Test real file upload response from box.com.
     * @throws Exception
     */
    public void testBoxNetFileUpload() throws Exception {
        BoxNetService boxNetService = new BoxNetService();
        BoxNetFileUploadResponse saveResult =
                boxNetService.saveFileToBoxNet(
                new SaveFileData("s7q6hkklutef9ex5jxk4z0kj7bkgcjq6",
                        "noname-1.85",
                        "3011590059",
                        "This is test data.3"));
        logger.info("Exception is : " + saveResult.exception);
        logger.info("Data is " + saveResult.toString());
        assertNotNull(saveResult);
    }
    
    public void testCreateBoxNetRequestData() throws Exception {
        SaveFileData saveFileData = new SaveFileData("s7q6hkklutef9ex5jxk4z0kj7bkgcjq6",
                "noname-1.85",
                "3011590059",
                "This is test data.3");
        ByteArrayBody body = new ByteArrayBody(saveFileData.getData().getBytes(), saveFileData.getFileName());
        MultipartEntity entity = new MultipartEntity(HttpMultipartMode.BROWSER_COMPATIBLE);
        entity.addPart("filename1", body);
        entity.addPart("folder_id", new StringBody("0"));
        String fileId = saveFileData.getFileId();
        String url = fileId == null ?
                "https://api.box.com/2.0/files/" + fileId + "/data" :
                    "https://api.box.com/2.0/files/data";
        String data = entity.toString();
        System.out.println("Contenty type is| " + entity.getContentType().getValue() + "\n");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        entity.writeTo(baos);
        System.out.println(baos.toString());
    }
    
    public void testSaveToBoxNet() {
        SaveFileData saveFileData = new SaveFileData("s7q6hkklutef9ex5jxk4z0kj7bkgcjq6",
                "noname-1.85",
                "3011590059",
                "This is test data.3");
        
    }
}
