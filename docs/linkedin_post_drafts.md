# Intel 8085 Microprocessor Simulator: Borland C++ DOS to React/AI

This folder contains the historical background, modernization details, and LinkedIn post drafts for the simulator.

---

## Visual Assets
The screenshot of the laboratory hardware kit to attach to your LinkedIn post is located at:
`screenshots/DOS/8085-hardware-kit.webp`

---

## 1. Project Background & History (1995)
* **The Origin**: Originally built in 1995 as a DOS application using **Borland C++**.
* **The Educational Problem**: In the mid-1990s, physical Intel 8085 microprocessor trainer kits in university labs were expensive, fragile, and frequently non-functional. Because of this, entire groups of students had to crowd around a single working hardware kit, meaning many never got enough hands-on time to actually learn and experiment.
* **The Solution**: The Borland C++ DOS simulator provided a visual, interactive lab environment where students could write, assemble, and step through code instruction-by-instruction. It democratized low-level systems education and made computer architecture accessible without needing physical silicon.

---

## 2. Rebuilding for the Web (2026 Stack)
To adapt the simulator for modern students and developers, we rebuilt it as a high-performance web application:
* **Frontend UI**: React and Vite for a modular, responsive single-page app (SPA).
* **Advanced Editor**: CodeMirror 6 with support for syntax highlighting, autocomplete, line numbers, and breakpoints.
* **Dual Execution Backend**: Seamlessly swaps at runtime between a native WebAssembly (WASM) engine compiled from the legacy C core, and a pure-JavaScript execution bridge.

---

## 3. How We Used Agentic AI (Antigravity) to Build the Modern Version
Rather than manual porting, the modernization was driven in collaboration with an agentic AI coding assistant. The AI acted as a systems engineer, automating complex tasks, writing tests, and resolving performance bottlenecks:

### A. Offloading Execution to background Web Workers
* **The Challenge**: Running the JS simulator engine in "Warp Speed" (executing millions of cycles per second) on the main browser thread completely froze the browser UI, making it impossible to type, step, or click "Stop."
* **The AI Solution**: The AI designed and implemented a background thread architecture using **Web Workers** (`simJs.worker.js`). The AI handled:
  * The message-passing protocol (`startWarp`, `stop`, `assertInterrupt`, `setInputPort`, `enqueueKeys`).
  * Safe serialization and transfers of memory buffers.
  * Throttled UI state updates (registers, memory, flags, and LEDs) back to the React UI in batches to avoid browser rendering lag.

### B. Real-Time On-The-Fly Syntax Linting
* **The Challenge**: Standard CodeMirror linters run asynchronously as the user types. However, compiling the active code in real-time would pollute the simulator's active running register and memory state.
* **The AI Solution**: The AI created a side-effect-free "dry-run" compiler (`simAssembleDryRun`) that compiles the code in a sandbox and restores the simulator's active states. It integrated this with CodeMirror 6's `@codemirror/lint` using the official `setDiagnostics` transaction to show wavy red underlines and hover tooltips dynamically as you type.

### C. Strict Register Operand Validation
* **The Challenge**: The legacy JS compiler was too permissive, silently compiling invalid code like `PUSH BC` or `MOV SP, A` into unrelated instructions instead of throwing syntax errors.
* **The AI Solution**: The AI implemented strict register validation checks matching the physical limits of 8085 silicon, raising warnings for invalid register pairs and formatting mismatches immediately in the editor.

### D. Regression Safety
* **The Challenge**: Modifying the compiler logic risked breaking existing instruction sets.
* **The AI Solution**: The AI expanded the test suite in `sim8085.test.js` to cover register validations and verified them via WSL, keeping the test suite at a 100% pass rate (all 393 tests passing).

---

## 4. LinkedIn Post Drafts

### Version A: Detailed Storytelling (Recommended)
> **From Borland C++ (DOS) to React & AI: Rebuilding a 30-Year-Old Simulator 🚀**
> 
> Thirty years ago, in 1995, I sat in front of a DOS monitor and compiled the first version of an Intel 8085 microprocessor simulator using **Borland C++**. 
> 
> At the time, university labs were a major bottleneck. Physical microprocessor trainer kits (similar to the one in the photo!) were expensive, fragile, and frequently broke down. Because of this, groups of students had to crowd around a single working board, and many never got enough actual hands-on time to learn. 
> 
> The DOS simulator changed that. By emulating the kit on lab computers, it gave every student their own virtual hardware to write assembly, step through registers, and see system states in real-time. 
> 
> Fast forward to 2026: I decided to give this 30-year-old project a fresh new life for the modern web using React, Vite, WASM, and CodeMirror 6. 
> 
> But instead of writing it all myself, I collaborated with an Agentic AI Coding Assistant. The results were mind-blowing. 🚀
> 
> Working together with AI, we took the simulator far beyond a simple web port:
> 
> 1️⃣ **Multi-threaded Background Emulation**: Running the simulation at "Warp Speed" (millions of instructions/sec) originally froze the browser's UI thread. The AI designed and implemented a Web Worker architecture to run the JS simulation loop in the background, keeping the UI fully responsive.
> 2️⃣ **Real-time On-The-Fly Linting**: To help students catch syntax mistakes instantly, the AI created a side-effect-free "dry-run" compiler. We hooked this up to CodeMirror 6 so it highlights assembly errors (like invalid register pairs or typos) in real-time as they type.
> 3️⃣ **Strict Assembler Validation**: The legacy assembler was too forgiving (silently compiling invalid code like `PUSH BC` or `MOV SP, A`). The AI refactored the parser to strictly validate register widths and operand boundaries, matching physical silicon.
> 4️⃣ **Zero Regression Safety**: The AI wrote comprehensive test cases, increasing our test suite to 394 automated tests, ensuring zero regressions on the legacy assembly instructions.
> 
> Building software with AI is no longer about simple code generation; it’s about having an autonomous partner design architectures, refactor state machines, write tests, and solve low-level integration issues. 
> 
> Seeing code I first compiled in DOS using Borland C++ running at warp speed on the web, fully modernized with AI, is incredibly fulfilling. 
> 
> Here's to the next generation of students learning microprocessor architecture! 🛠️
> 
> #Intel8085 #SoftwareEngineering #Microprocessors #AI #AgenticAI #Coding #EdTech #WebAssembly #ReactJS #Vite #Borland #DOS

***

### Version B: Technical & AI Focus
> **How do you modernize a 30-year-old DOS program built in Borland C++ for the modern web?**
> 
> With React, Vite, WebAssembly, and a powerful Agentic AI pair programmer. 💻⚡
> 
> I recently decided to upgrade my legacy 1995 Intel 8085 simulator. Back then, lab hardware kits (like the one pictured) were frequently broken, forcing crowds of students to share a single board. The simulator solved this by giving everyone a virtual workspace. 
> 
> Using an AI coding agent, we systematically solved complex engineering hurdles to bring it to 2026:
> 
> * **Background Web Workers**: Solved main-thread UI freezing during high-speed "Warp" simulation runs by offloading execution to background Web Workers. Batched UI updates keep the React view responsive.
> * **On-the-Fly Linting**: Integrated CodeMirror 6 with a new, side-effect-free "dry-run" compiler to highlight syntax errors and show warnings on hover—in real-time as users type.
> * **Strict Parser Constraints**: Replaced permissive legacy parsing with strict register validators (`getReg8`, `getRegPair`, etc.) to prevent invalid instructions like `PUSH BC` from compiling silently.
> * **Vitest Suite**: Expanded test coverage to 394 automated tests (run via WSL) to ensure zero regressions on the assembly execution logic.
> 
> AI didn't just generate boilerplate; it collaborated on design decisions, managed multi-threaded state synchronization, and ran test pipelines. Modernizing legacy software has never been faster or more rewarding.
> 
> Check out the full story and write some 8085 assembly in the browser! 🚀
> 
> #SoftwareArchitecture #WebDevelopment #ReactJS #WASM #GenerativeAI #AIProgramming #RetroHardware #CodeMirror #BorlandCpp #DOS

***

### Version C: Short & High-Impact
> **From a 1995 DOS app built in Borland C++ to a 2026 AI-modernized web simulator. 🚀**
> 
> In 1995, university lab hardware kits (like the one pictured) were often broken, forcing crowds of students to share a single board. Rebuilding it as a DOS simulator gave every student a virtual hardware environment to learn.
> 
> Now, using an Agentic AI Coding Assistant, we've rebuilt it into a high-performance React web application:
> ⚡ **Web Worker Emulation**: Background execution loops keep the UI fully responsive even at warp speed.
> ✏️ **Real-time Linting**: CodeMirror highlights assembler mistakes (like `PUSH BC` or syntax errors) in real-time as you type.
> 🔬 **Strict Validation**: Parser now strictly validates register widths, matching physical silicon rules.
> 🧪 **Vitest Validation**: 394 automated tests verify compile and execution correctness.
> 
> AI acted as a true engineering partner, proposing architectures, implementing complex state syncs, and writing tests. Modernizing legacy code has entered a whole new era.
> 
> #AI #WebAssembly #ReactJS #EdTech #Coding #Microprocessors #Microcontrollers #BorlandCpp #DOS
