package com.shastram.test;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.Scanner;
import java.util.logging.Level;
import java.util.logging.Logger;

import junit.framework.Assert;

import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.mortbay.log.Log;

import com.shastram.client.Exe;
import com.shastram.client.MicroCode;

public class TestInstructions {

    private static Logger logger = Logger.getLogger(TestInstructions.class.getName());

    @Before
    public void setup() {
        // Config.printInstructions = false;
    }

    @SuppressWarnings("unused")
    @Ignore
    public void smallTest() throws Exception {
        String testArithmetic = "arithmetic_tests.85";
        String loadStoreTests = "load_store.85";
        String testMov = "mov_tests.85";
        String testLxi = "lxi_tests.85";
        String testName = testMov;
        testFile(testName);
    }

    public void testFile(String testName) throws FileNotFoundException, IOException {
        String fullTestcaseName = "src/com/shastram/public/testCases/" + testName;
        BufferedReader in = new BufferedReader(new FileReader(fullTestcaseName));
        Scanner s = new Scanner(in);
        StringBuffer buffer = new StringBuffer();
        while (s.hasNext()) {
            buffer.append(s.nextLine()).append("\n");
        }
        Exe exe = new Exe();
        try {
            exe.compileCode(buffer.toString(), fullTestcaseName);
            // run until hlt is executed
            while (!exe.hltExecuted()) {
                exe.step();
            }
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Failed with ", e);
            Assert.fail(e.getMessage());
        }
    }

    private static String[] testNames = {
            // "temp_test.85",
            "inout_test.85", "interrupt_test.85", "rst_test.85", "stack_test.85", "branch_test.85",
            "complement_test.85", "rotate_test.85", "logical_test.85", "compare_test.85", "arithmetic_tests.85",
            "load_store.85", "mov_tests.85", "lxi_tests.85", };

    public static String[] getTestNames() {
        return testNames;
    }

    @Test
    public void testLoadStore() throws Exception {
        testFile("load_store.85");
    }

    @Test
    public void testMov() throws Exception {
        testFile("mov_tests.85");
    }

    @Test
    public void testLxi() throws Exception {
        testFile("lxi_tests.85");
    }

    @Test
    public void testTemp() throws Exception {
        testFile("temp_test.85");
    }

    @Test
    public void testLogical() throws Exception {
        testFile("logical_test.85");
    }

    @Test
    public void testCompare() throws Exception {
        testFile("compare_test.85");
    }

    @Test
    public void testArithmetic() throws Exception {
        testFile("arithmetic_tests.85");
    }

    @Test
    public void testStack() throws Exception {
        testFile("stack_test.85");
    }

    @Test
    public void testBranch() throws Exception {
        testFile("branch_test.85");
    }

    @Test
    public void testComplement() throws Exception {
        testFile("complement_test.85");
    }

    @Test
    public void testRotate() throws Exception {
        testFile("rotate_test.85");
    }

    @Test
    public void testInout() throws Exception {
        testFile("inout_test.85");
    }

    @Test
    public void testInterrupt() throws Exception {
        testFile("interrupt_test.85");
    }

    @Test
    public void testRst() throws Exception {
        testFile("rst_test.85");
    }

    @Ignore
    @Test
    public void testMicrocodeSelfTest() throws Exception {
        MicroCode.selfTest();
    }

    @Test
    @Ignore
    public void testAll() throws IOException {
        // tests = new String[] { "rst_test.85" };
        MicroCode.selfTest();
        for (String s : testNames) {
            testFile(s);
        }
        Log.info("Finished All tests");
    }
}
