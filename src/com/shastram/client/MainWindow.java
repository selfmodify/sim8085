package com.shastram.client;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.logging.Logger;

import com.google.gwt.core.client.GWT;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.MouseDownEvent;
import com.google.gwt.event.dom.client.MouseDownHandler;
import com.google.gwt.event.dom.client.MouseUpEvent;
import com.google.gwt.event.dom.client.MouseUpHandler;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.MenuBar;
import com.google.gwt.user.client.ui.MenuItem;
import com.google.gwt.user.client.ui.TextArea;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.gwt.user.client.ui.Widget;
import com.shastram.client.MicroCode.OneInstruction;
import com.shastram.client.pattern.Observer;
import com.shastram.client.pattern.SignalSlot;
import com.shastram.client.pattern.SignalSlot.SignalData;
import com.shastram.client.pattern.SignalSlot.Signals;
import com.shastram.client.rpc.SaveFileData;
import com.shastram.client.ui.ExamplesLoadCommand;

public class MainWindow extends Composite implements Observer {

    private static final int NUM_MEMORY_ADDRESS_PER_ROW = 8;

    private static MainWindowUiBinder uiBinder = GWT.create(MainWindowUiBinder.class);

    interface MainWindowUiBinder extends UiBinder<Widget, MainWindow> {
    }

    @UiField
    Button compile;

    @UiField
    TextArea sourceCode;

    @UiField
    TextArea errorWindow;

    @UiField
    VerticalPanel memoryWindow;

    @UiField
    VerticalPanel memoryWindowAddress;

    @UiField
    Button stepButton;

    @UiField
    Button stepOverButton;

    @UiField
    Button stepOutButton;

    @UiField
    HorizontalPanel registerWindowValues;

    @UiField
    HorizontalPanel registerWindowValues2;
    @UiField
    HorizontalPanel flagValues;

    @UiField
    Button memoryScrollUp;

    @UiField
    Button memoryScrollDown;

    // @UiField
    // CheckBox memoryFollowIp;

    @UiField
    VerticalPanel disassemblyWindow;

    @UiField
    VerticalPanel stackWindowAddress;

    @UiField
    VerticalPanel stackWindow;

    @UiField
    MenuBar menuBar;

    @UiField
    MenuItem examplesMenuItem;

    @UiField
    Label optionalFileName;

    @UiField
    MenuBar exampleItems;

    @UiField
    MenuItem saveToBoxNet;

    @UiField
    Label statusUpdateLabel;

    @UiField
    VerticalPanel askForFilenamePanel;

    @UiField
    TextBox userEnteredFilename;

    @UiField
    Button userEnteredFilenameSave;
    
    @UiField
    Button userEnteredFilenameCancel;

    Timer multiStepTimer;
    public static Sim8085ServicesAsync rpcService = GWT.create(Sim8085Services.class);

    private static Logger logger = Logger.getLogger(MainWindow.class.getName());
    private final Exe exe = new Exe();

    private HashMap<String, HorizontalPanel> registerValueMap;
    private int memoryStart = 0;
    private int disassemblyMemoryStart = 0;

    private HashMap<String, HorizontalPanel> flagValueMap;

    private final ArrayList<TextBox> prevHighlightAddress = new ArrayList<TextBox>();

    private final ArrayList<TextBox> prevHighlightValue = new ArrayList<TextBox>();

    private TextBox prevStackHighlightAddress;

    private TextBox prevStackHighlightValue;

    private TextBox prevHighlightDisassemblyAddress;

    private TextBox prevHighlightDisassemblyValue;

    private final int maxMemoryWindowRows = 5;

    private final int maxDisassemblyRows = 10;

    private String filename;

    public MainWindow() {
        initWidget(uiBinder.createAndBindUi(this));
        Style style = new Style(); // create a dummy one
        Style.style = style;
        sourceCode.setText("mvi b,2\nmov a,b\nmov c,b");
        createMemoryWindowItems(maxMemoryWindowRows);
        createDisassemblyWindowItems(maxDisassemblyRows);
        createStackWindowItems(maxMemoryWindowRows);
        createRegisterWindowNames();
        createFlagWindow();
        refreshRegistersAndFlags();
        fillMemoryWindow(false);
        fillDisassemblyWindow();
        fillStackWindow(false);
        // refresh the register and memory window to remove the red highlight
        refreshRegistersAndFlags();
        setMemoryScrollMouseHandler();
        getExampleCodeList();
        UiHelper.loadSourceCodeLocally(sourceCode);
        SignalSlot.instance.addObserver(SignalSlot.Signals.EXAMPLE_SOURCE_CODE_AVAILABLE, this);
        setSaveHandler();
    }

    /**
     * Handles 'Save to box.net'
     */
    private void setSaveHandler() {
        saveToBoxNet.setCommand(new Command() {
            @Override
            public void execute() {
                saveFileLocally();
                if (Utils.isEmpty(filename)) {
                    askUserForFilename();
                } else {
                    if (UiHelper.getAuthToken() == null) {
                        getBoxNetAuthToken();
                    } else {
                        saveSourceCodeToBoxNet(filename, null, sourceCode.getText(), statusUpdateLabel);
                    }
                }
            }
        });
        if (UiHelper.saveTicketAndAuthcodeFromUrl()) {
            // an auth code was saved, now save the file on box.net
            saveSourceCodeToBoxNet("filename.85", null, sourceCode.getText(), statusUpdateLabel);
        }
    }

    private void askUserForFilename() {
        askForFilenamePanel.setVisible(true);
        userEnteredFilename.setFocus(true);
    }

    private void setMemoryScrollMouseHandler() {
        // mouse UP/DOWN handler
        memoryScrollDown.addMouseDownHandler(new MouseDownHandler() {
            @Override
            public void onMouseDown(MouseDownEvent event) {
                if (memoryStart < 65536) {
                    memoryStart += NUM_MEMORY_ADDRESS_PER_ROW;
                    memoryStart = Exe.normalizeMemoryAddress(memoryStart);
                    fillMemoryWindow(false, false);
                }
            }
        });

        memoryScrollUp.addMouseUpHandler(new MouseUpHandler() {
            @Override
            public void onMouseUp(MouseUpEvent event) {
                if (memoryStart > 0) {
                    memoryStart -= NUM_MEMORY_ADDRESS_PER_ROW;
                    memoryStart = Exe.normalizeMemoryAddress(memoryStart);
                    fillMemoryWindow(false, false);
                }
            }
        });
    }

    private void getExampleCodeList() {
        exampleItems.clearItems();
        exampleItems.addItem("Loading examples ...", (Command) null);
        rpcService.getExampleNames(new AsyncCallback<List<String>>() {
            @Override
            public void onSuccess(List<String> result) {
                exampleItems.clearItems();
                for (final String name : result) {
                    MenuItem item = new MenuItem(name, (MenuBar) null);
                    item.addStyleName(Style.style.css.exampleMenuItems());
                    item.setCommand(new ExamplesLoadCommand(item) {
                        @Override
                        public void execute() {
                            this.loadRemoteExample(name);
                        }
                    });
                    item.setTitle(name);
                    item.setText(name);
                    exampleItems.addItem(item);
                    exampleItems.addSeparator();
                }
            }

            @Override
            public void onFailure(Throwable caught) {
            }
        });
    }

    private void createDisassemblyWindowItems(int maxRows) {
        disassemblyWindow.clear();
        for (int i = 0; i < maxRows; ++i) {
            HorizontalPanel hp = new HorizontalPanel();
            TextBox addr = createMemoryAddressTextbox();
            hp.add(addr);
            TextBox value = createValueTextbox(Style.style.css.disassemblyTextBox());
            hp.add(value);
            disassemblyWindow.add(hp);
        }
    }

    private void fillDisassemblyWindow() {
        boolean followIp = true;
        if (followIp) {
            boolean changeMemoryStart = exe.ip < disassemblyMemoryStart
                    || exe.ip >= disassemblyMemoryStart + disassemblyWindow.getWidgetCount();
            if (changeMemoryStart) {
                disassemblyMemoryStart = exe.ip;
            }
        }
        removeFollowMemoryHighlight(prevHighlightDisassemblyAddress, prevHighlightDisassemblyValue);
        int addr = disassemblyMemoryStart;
        for (int i = 0; i < disassemblyWindow.getWidgetCount(); ++i) {
            HorizontalPanel hp = (HorizontalPanel) disassemblyWindow.getWidget(i);
            TextBox addrBox = (TextBox) hp.getWidget(0);
            addrBox.setText(" " + Utils.toHex4Digits(addr) + ":  ");
            TextBox valueBox = (TextBox) hp.getWidget(1);
            DebugLineInfo debugInfo = exe.getDebugInfo(addr);
            if (addr == exe.ip) {
                updateFollowMemoryHighlight(addrBox, valueBox);
                prevHighlightDisassemblyAddress = addrBox;
                prevHighlightDisassemblyValue = valueBox;
            }
            if (debugInfo != null) {
                valueBox.setText(debugInfo.getToken());
                addr += debugInfo.getInstructionLength();
            } else {
                valueBox.setText("nop");
                ++addr;
            }
        }
    }

    private void createRegisterWindowNames() {
        registerWindowValues.clear();
        registerWindowValues2.clear();
        registerValueMap = new HashMap<String, HorizontalPanel>();
        String[] names = { "a", "b", "c", "d", "e" };
        String[] names2 = { "h", "l", "sp", "psw", "ip" };
        addLabelValuePairToPanel(names, registerWindowValues);
        addLabelValuePairToPanel(names2, registerWindowValues2);
    }

    public void addLabelValuePairToPanel(String[] names, HorizontalPanel parentPanel) {
        for (String n : names) {
            TextBox name = createRegisterValueTextbox();
            name.setText(n);
            name.setReadOnly(true);
            TextBox value = createRegisterValueTextbox();
            HorizontalPanel hp = createRegOrFlagBox(name, value);
            registerValueMap.put(n, hp);
            parentPanel.add(hp);
        }
    }

    public HorizontalPanel createRegOrFlagBox(TextBox name, TextBox value) {
        HorizontalPanel hp = new HorizontalPanel();
        hp.setSpacing(0);
        hp.add(name);
        hp.add(value);
        Label l = new Label("|");
        l.setWidth("9px");
        hp.add(l);
        return hp;
    }

    private void createFlagWindow() {
        flagValues.clear();
        String[] names = { "S", "Z", "Aux", "P", "Cy" };
        flagValueMap = new HashMap<String, HorizontalPanel>();
        for (String n : names) {
            TextBox name = createRegisterValueTextbox();
            name.setText(n);
            name.setReadOnly(true);
            TextBox value = createRegisterValueTextbox();
            HorizontalPanel hp = createRegOrFlagBox(name, value);
            flagValueMap.put(n, hp);
            flagValues.add(hp);
        }
    }

    private void createMemoryWindowItems(int maxRows) {
        memoryWindow.clear();
        for (int i = 0; i < maxRows; ++i) {
            HorizontalPanel hp = new HorizontalPanel();
            TextBox addr = createMemoryAddressTextbox();
            memoryWindowAddress.add(addr);
            for (int j = 0; j < NUM_MEMORY_ADDRESS_PER_ROW; ++j) {
                TextBox value = createValueTextbox(Style.style.css.memoryTextBox());
                hp.add(value);
            }
            memoryWindow.add(hp);
        }
    }

    private void createStackWindowItems(int maxRows) {
        stackWindow.clear();
        stackWindowAddress.clear();
        for (int i = 0; i < maxRows; ++i) {
            HorizontalPanel hp = new HorizontalPanel();
            TextBox addr = createMemoryAddressTextbox();
            stackWindowAddress.add(addr);
            TextBox value = createValueTextbox(Style.style.css.memoryAddressTextBox());
            hp.add(value);
            stackWindow.add(hp);
        }
    }

    public TextBox createValueTextbox(String style) {
        TextBox addr = new TextBox();
        addr.addStyleName(style);
        return addr;
    }

    public TextBox createMemoryAddressTextbox() {
        TextBox addr = new TextBox();
        addr.addStyleName(Style.style.css.memoryAddressTextBox());
        addr.setReadOnly(true);
        return addr;
    }

    public TextBox createRegisterValueTextbox() {
        TextBox addr = new TextBox();
        addr.addStyleName(Style.style.css.registerTextBox());
        return addr;
    }

    private void fillMemoryWindow(boolean highlight, boolean followIp) {
        if (followIp) {
            boolean changeMemoryStart = exe.ip < memoryStart
                    || exe.ip >= memoryStart + memoryWindow.getWidgetCount() * NUM_MEMORY_ADDRESS_PER_ROW;
            if (changeMemoryStart) {
                memoryStart = exe.ip;
            }
        }
        removeFollowMemoryHighlight(prevHighlightAddress, prevHighlightValue);
        int start = memoryStart;
        int addr = start;
        int withinInstruction = 0; // Used to highlight instruction longer than
                                   // 1 byte
        for (int i = 0; i < memoryWindow.getWidgetCount(); ++i) {
            TextBox addrBox = (TextBox) memoryWindowAddress.getWidget(i);
            addrBox.setText(" " + Utils.toHex4Digits(addr) + ":  ");
            HorizontalPanel hp = (HorizontalPanel) memoryWindow.getWidget(i);
            for (int j = 0; j < hp.getWidgetCount(); ++j) {
                TextBox valueTextbox = (TextBox) hp.getWidget(j);
                String newValue = Utils.toHex2Digits(exe.getMemory(addr));
                updateTextboxValue(newValue, valueTextbox, highlight);
                if (addr == exe.ip) {
                    prevHighlightAddress.add(addrBox);
                    prevHighlightValue.add(valueTextbox);
                    int code = exe.getMemAtIp();
                    if (code >= 0 && code < MicrocodeTable.table.length) {
                        OneInstruction oneInstruction = MicrocodeTable.table[code];
                        withinInstruction = oneInstruction.length;
                    }
                } else if (withinInstruction > 0) {
                    prevHighlightValue.add(valueTextbox);
                }
                if (withinInstruction > 0) {
                    --withinInstruction;
                }
                ++addr;
            }
        }
        updateFollowMemoryHighlight(prevHighlightAddress, prevHighlightValue);
    }

    private void fillMemoryWindow(boolean highlight) {
        fillMemoryWindow(highlight, true /* memoryFollowIp.getValue() */);
    }

    private void fillStackWindow(boolean highlight) {
        int addr = exe.getSP();
        removeFollowMemoryHighlight(prevStackHighlightAddress, prevStackHighlightValue);
        for (int i = 0; i < stackWindow.getWidgetCount(); ++i) {
            TextBox addrBox = (TextBox) stackWindowAddress.getWidget(i);
            addrBox.setText(" " + Utils.toHex4Digits(addr) + ":  ");
            HorizontalPanel hp = (HorizontalPanel) stackWindow.getWidget(i);
            TextBox valueTextbox = (TextBox) hp.getWidget(0);
            String newValue = Utils.toHex4Digits(exe.getMemory(addr));
            updateTextboxValue(newValue, valueTextbox, highlight);
            if (addr == exe.sp) {
                updateFollowMemoryHighlight(addrBox, valueTextbox);
                prevStackHighlightAddress = addrBox;
                prevStackHighlightValue = valueTextbox;
            }
            ++addr;
        }
    }

    private void updateFollowMemoryHighlight(TextBox addrBox, TextBox value) {
        value.addStyleName(Style.style.css.currentInstructionHighlight());
        addrBox.addStyleName(Style.style.css.currentAddressHighlight());
    }

    private void updateFollowMemoryHighlight(ArrayList<TextBox> addrBox, ArrayList<TextBox> values) {
        for (TextBox t : addrBox) {
            t.addStyleName(Style.style.css.currentAddressHighlight());
        }
        for (TextBox t : values) {
            t.addStyleName(Style.style.css.currentInstructionHighlight());
        }
    }

    public void removeFollowMemoryHighlight(TextBox prevAddr, TextBox prevValue) {
        if (prevAddr != null) {
            prevAddr.removeStyleName(Style.style.css.currentAddressHighlight());
        }
        if (prevValue != null) {
            prevValue.removeStyleName(Style.style.css.currentInstructionHighlight());
        }
    }

    public void removeFollowMemoryHighlight(ArrayList<TextBox> prevAddr, ArrayList<TextBox> prevValues) {
        for (TextBox t : prevAddr) {
            t.removeStyleName(Style.style.css.currentAddressHighlight());
        }
        for (TextBox t : prevValues) {
            t.removeStyleName(Style.style.css.currentInstructionHighlight());
        }
        prevValues.clear();
        prevAddr.clear();
    }

    @UiHandler("compile")
    public void compileHandler(ClickEvent e) {
        long begin = System.currentTimeMillis();
        String text = sourceCode.getText();
        try {
            exe.compileCode(text, "");
            exe.reset();
            errorWindow.setText("Finished parsing");
            exe.reset();
            clearHighlights();
            refreshRegistersAndFlags();
            fillMemoryWindow(false);
            fillDisassemblyWindow();
            fillStackWindow(false);
            // refresh the register and memory window to remove the red
            // highlight
            refreshRegistersAndFlags();
            long diff = ((System.currentTimeMillis() - begin));
            errorWindow.setText("Finished compilation in " + diff + " milli seconds");
        } catch (Exception ex) {
            errorWindow.setText(ex.getMessage());
        }
    }

    /**
     * Clear highlight of the various boxes
     */
    private void clearHighlights() {
        errorWindow.setText("");
        removeFollowMemoryHighlight(prevHighlightAddress, prevHighlightValue);
        removeFollowMemoryHighlight(prevHighlightDisassemblyAddress, prevHighlightDisassemblyValue);
    }

    @UiHandler("stepButton")
    public void stepButtonHandler(ClickEvent e) {
        try {
            exe.step();
        } catch (Exception e1) {
            errorWindow.setText(e1.getMessage());
        } finally {
            refreshUI();
            refreshDebugInfo();
        }
    }

    private void refreshDebugInfo() {
        if (exe.hltExecuted) {
            errorWindow.setText("HLT Executed at ip=" + exe.ip);
        } else {
            DebugLineInfo debugInfo = exe.getDebugInfo(exe.ip);
            if (debugInfo != null) {
                errorWindow.setText("Next instruction, Line: " + debugInfo.line + " " + debugInfo.getToken());
            }
        }
    }

    private void refreshUI() {
        refreshRegistersAndFlags();
        fillMemoryWindow(true);
        fillDisassemblyWindow();
        fillStackWindow(true);
    }

    @UiHandler("stepOverButton")
    public void stepOverButtonHandler(ClickEvent e) {
        int prevCallLevel = exe.callLevel;
        multiStep(prevCallLevel);
    }

    private void multiStep(int prevCallLevel) {
        exe.breakNow = false;
        if (multiStepTimer != null) {
            multiStepTimer.cancel();
        }
        multiStepOnTimer(prevCallLevel);
    }

    /**
     * Run a multi step or run (like step out, step over) operation using a
     * timer to allow a responsive UI.
     * 
     * @param prevCallLevel
     */
    private void multiStepOnTimer(final int prevCallLevel) {
        try {
            int counter = 0; // do a short sleep after some number of
                             // instructions
            while (!exe.hltExecuted && !exe.breakNow && counter < 50) {
                exe.step();
                if (exe.returnExecuted && prevCallLevel == exe.callLevel) {
                    break;
                }
                ++counter;
            }
            if (multiStepTimer != null) {
                multiStepTimer.cancel();
            }
            multiStepTimer = new Timer() {
                @Override
                public void run() {
                    multiStepOnTimer(prevCallLevel);
                }
            };
            multiStepTimer.schedule(25);
        } catch (Exception e1) {
            errorWindow.setText(e1.getMessage());
        } finally {
            refreshUI();
            refreshDebugInfo();
        }
    }

    @UiHandler("stepOutButton")
    public void stepOutButtonHandler(ClickEvent e) {
        int prevCallLevel = exe.callLevel - 1;
        multiStep(prevCallLevel);
    }

    @UiHandler("breakButton")
    public void breakButtonHandler(ClickEvent e) {
        exe.breakNow = true;
    }

    public void refreshRegistersAndFlags() {
        updateTextboxValue(exe.getA(), registerValueMap.get("a"));
        updateTextboxValue(exe.b, registerValueMap.get("b"));
        updateTextboxValue(exe.c, registerValueMap.get("c"));
        updateTextboxValue(exe.d, registerValueMap.get("d"));
        updateTextboxValue(exe.e, registerValueMap.get("e"));
        updateTextboxValue(exe.h, registerValueMap.get("h"));
        updateTextboxValue(exe.l, registerValueMap.get("l"));
        updateTextboxValue(exe.sp, registerValueMap.get("sp"));
        updateTextboxValue(exe.psw, registerValueMap.get("psw"));
        updateTextboxValue(exe.ip, registerValueMap.get("ip"));

        // refresh flags
        updateTextboxValue(exe.sign, flagValueMap.get("S"));
        updateTextboxValue(exe.zero, flagValueMap.get("Z"));
        updateTextboxValue(exe.auxCarry, flagValueMap.get("Aux"));
        updateTextboxValue(exe.parity, flagValueMap.get("P"));
        updateTextboxValue(exe.carry, flagValueMap.get("Cy"));
    }

    private void updateTextboxValue(boolean sign, HorizontalPanel hp) {
        if (hp.getWidgetCount() > 1) {
            TextBox textBox = (TextBox) hp.getWidget(1);
            String newValue = toHex(sign);
            updateTextboxValue(newValue, textBox, true);
        }
    }

    private String toHex(boolean v) {
        String str = Integer.toHexString(v ? 1 : 0);
        return str;
    }

    private void updateTextboxValue(String newValue, TextBox textBox, boolean highlight) {
        String oldValue = textBox.getText().trim();
        textBox.setText(newValue);
        if (!oldValue.equals(newValue) && highlight) {
            textBox.addStyleName(Style.style.css.memoryWindowHighlight());
        } else {
            textBox.removeStyleName(Style.style.css.memoryWindowHighlight());
        }
    }

    private void updateTextboxValue(int v, HorizontalPanel hp) {
        if (hp.getWidgetCount() > 1) {
            TextBox textBox = (TextBox) hp.getWidget(1);
            updateTextboxValue(v, textBox);
        }
    }

    private void updateTextboxValue(int v, TextBox textBox) {
        String newValue = Utils.toHex2Digits(v);
        updateTextboxValue(newValue, textBox, true);
    }

    @Override
    public void update(SignalData data) {
        if (data.signal == Signals.EXAMPLE_SOURCE_CODE_AVAILABLE) {
            String name = (String) data.mapData.get("name");
            String code = (String) data.mapData.get("code");
            sourceCode.setText(code);
            optionalFileName.setText("  : " + name);
        }
    }

    public void saveFileLocally() {
        UiHelper.saveSourceCodeLocally(sourceCode);
    }

    /**
     * 1. Save the source code locally. 2. Get a ticket from the backend 3.
     * Redirect the user to box.net
     */
    public void getBoxNetAuthToken() {
        String authToken = UiHelper.getAuthToken();
        rpcService.getTicket(new AsyncCallback<String>() {
            @Override
            public void onFailure(Throwable caught) {
                UiHelper.clearBoxNetAuthCookies();
            }

            @Override
            public void onSuccess(String ticket) {
                Window.open("https://www.box.com/api/1.0/auth/" + ticket, "_self", "");
            }
        });
        logger.info("Saving to box.net");
    }

    /**
     * Save the source code to box.net.
     * 
     * @param rpcService
     * @param filename
     * @param data
     */
    public static void saveSourceCodeToBoxNet(String fileId, String fileName, String data, final Label label) {
        label.setText("Saving " + fileName + " ...");
        rpcService.saveFile(new SaveFileData(UiHelper.getAuthToken(), fileName, fileId, data),
                new AsyncCallback<String>() {
                    @Override
                    public void onSuccess(String result) {
                        label.setText("Successfully saved file");
                    }

                    @Override
                    public void onFailure(Throwable caught) {
                        label.setText("Failed to save file " + caught.getMessage());
                    }
                });
    }
    
    @UiHandler("userEnteredFilenameSave")
    public void userEnteredFilenameSaveHandler(ClickEvent e) {
        String fileNameTemp = userEnteredFilename.getText().trim();
        if (!Utils.isEmpty(fileNameTemp)) {
            this.filename = fileNameTemp;
            saveSourceCodeToBoxNet(filename, null, sourceCode.getText(), statusUpdateLabel);
            userEnteredFilenameCancelHandler(null);
        }
    }

    @UiHandler("userEnteredFilenameCancel")
    public void userEnteredFilenameCancelHandler(ClickEvent e) {
        askForFilenamePanel.setVisible(false);
    }
}
