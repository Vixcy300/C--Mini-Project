#include <windows.h>
#include <string>
#include <vector>

// --- Data Structures ---
struct Question {
    std::wstring text;
    std::vector<std::wstring> options;
    int correctIndex; // 0-based
    std::wstring feedback;
};

std::vector<Question> quizBank = {
    {L"What is the core ideology behind C++?", {L"Procedural", L"Object-Oriented", L"Multi-paradigm", L"Functional"}, 2, L"C++ is a multi-paradigm language."},
    {L"Which operator is used to allocate dynamic memory?", {L"malloc", L"new", L"alloc", L"pointer"}, 1, L"The 'new' operator is used in C++."},
    {L"What does the 'virtual' keyword enable?", {L"Abstract classes", L"Runtime polymorphism", L"Memory packing", L"Multiple inheritance"}, 1, L"Virtual enables dynamic dispatch."},
    {L"Which is NOT a standard smart pointer?", {L"unique_ptr", L"shared_ptr", L"weak_ptr", L"scoped_ptr"}, 3, L"scoped_ptr is from Boost, not STD."},
    {L"What defines a 'constexpr'?", {L"A macro", L"Evaluated at compile time", L"Inline assembly", L"Read-only"}, 1, L"constexpr is evaluated at compile time."}
};

int currentQuestion = 0;
int score = 0;
int streak = 0;

// --- UI Elements ---
HWND hTitle, hQuestion, hFeedback, hScoreTracker;
HWND hBtn[4];
HWND hNextBtn;

// --- Helper to update UI ---
void LoadQuestion(int index) {
    if (index < quizBank.size()) {
        SetWindowTextW(hQuestion, quizBank[index].text.c_str());
        for (int i = 0; i < 4; i++) {
            SetWindowTextW(hBtn[i], quizBank[index].options[i].c_str());
            EnableWindow(hBtn[i], TRUE);
        }
        SetWindowTextW(hFeedback, L"Select an answer!");
        EnableWindow(hNextBtn, FALSE);
    } else {
        SetWindowTextW(hQuestion, L"QUIZ COMPLETED!");
        for (int i = 0; i < 4; i++) {
            ShowWindow(hBtn[i], SW_HIDE);
        }
        std::wstring finalScore = L"Outstanding! Final Score: " + std::to_wstring(score) + L" Points!";
        SetWindowTextW(hFeedback, finalScore.c_str());
        EnableWindow(hNextBtn, FALSE);
    }
}

// --- Window Procedure ---
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
        case WM_CREATE: {
            // Title
            hTitle = CreateWindowW(L"STATIC", L"⚡ C++ Adaptive Quiz Arena ⚡", WS_VISIBLE | WS_CHILD | SS_CENTER, 20, 20, 540, 30, hwnd, NULL, NULL, NULL);
            
            // Score Tracker
            hScoreTracker = CreateWindowW(L"STATIC", L"Score: 0  |  Streak: 0x", WS_VISIBLE | WS_CHILD | SS_RIGHT, 350, 20, 210, 20, hwnd, NULL, NULL, NULL);

            // Question Text
            hQuestion = CreateWindowW(L"STATIC", L"Question loading...", WS_VISIBLE | WS_CHILD | SS_CENTER, 20, 70, 540, 60, hwnd, NULL, NULL, NULL);

            // Buttons
            for (int i = 0; i < 4; i++) {
                hBtn[i] = CreateWindowW(L"BUTTON", L"Option", WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON, 150, 140 + (i * 45), 280, 35, hwnd, (HMENU)(uintptr_t)(100 + i), NULL, NULL);
            }

            // Feedback System
            hFeedback = CreateWindowW(L"STATIC", L"", WS_VISIBLE | WS_CHILD | SS_CENTER, 20, 330, 540, 40, hwnd, NULL, NULL, NULL);
            
            // Next Button
            hNextBtn = CreateWindowW(L"BUTTON", L"Next Question ->", WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON, 200, 380, 180, 40, hwnd, (HMENU)200, NULL, NULL);

            // Set Fonts (Make it look slightly better than default 90s aesthetic)
            HFONT hFont = CreateFontW(18, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, DEFAULT_QUALITY, DEFAULT_PITCH | FF_SWISS, L"Segoe UI");
            HFONT hTitleFont = CreateFontW(22, 0, 0, 0, FW_HEAVY, FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, DEFAULT_QUALITY, DEFAULT_PITCH | FF_SWISS, L"Segoe UI");
            
            SendMessage(hTitle, WM_SETFONT, (WPARAM)hTitleFont, TRUE);
            SendMessage(hQuestion, WM_SETFONT, (WPARAM)hFont, TRUE);
            for (int i=0; i<4; i++) SendMessage(hBtn[i], WM_SETFONT, (WPARAM)hFont, TRUE);

            LoadQuestion(currentQuestion);
            return 0;
        }

        case WM_COMMAND: {
            int wmId = LOWORD(wParam);
            
            // Answer Buttons (100 - 103)
            if (wmId >= 100 && wmId <= 103) {
                int selectedAnswer = wmId - 100;
                
                // Disable buttons after answer
                for(int i=0; i<4; i++) EnableWindow(hBtn[i], FALSE);
                
                if (selectedAnswer == quizBank[currentQuestion].correctIndex) {
                    streak++;
                    int points = 10 + (streak * 5);
                    score += points;
                    
                    std::wstring fb = L"✅ CORRECT! +" + std::to_wstring(points) + L" Points.\n" + quizBank[currentQuestion].feedback;
                    SetWindowTextW(hFeedback, fb.c_str());
                } else {
                    streak = 0;
                    std::wstring fb = L"❌ WRONG!\n" + quizBank[currentQuestion].feedback;
                    SetWindowTextW(hFeedback, fb.c_str());
                }
                
                std::wstring tracker = L"Score: " + std::to_wstring(score) + L"  |  Streak: " + std::to_wstring(streak) + L"x";
                SetWindowTextW(hScoreTracker, tracker.c_str());
                
                EnableWindow(hNextBtn, TRUE);
            }
            
            // Next Button
            if (wmId == 200) {
                currentQuestion++;
                LoadQuestion(currentQuestion);
            }
            
            return 0;
        }

        case WM_CTLCOLORSTATIC: {
            HDC hdcStatic = (HDC)wParam;
            SetBkMode(hdcStatic, TRANSPARENT);
            return (LRESULT)GetStockObject(HOLLOW_BRUSH);
        }

        case WM_DESTROY: {
            PostQuitMessage(0);
            return 0;
        }
    }
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

// --- Main Entry ---
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    const wchar_t CLASS_NAME[] = L"QuizAppClass";

    WNDCLASSW wc = { };
    wc.lpfnWndProc   = WindowProc;
    wc.hInstance     = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wc.hCursor       = LoadCursor(NULL, IDC_ARROW);

    RegisterClassW(&wc);

    HWND hwnd = CreateWindowExW(
        0, CLASS_NAME, L"C++ Quiz Application (Frontend Edition)",
        WS_OVERLAPPEDWINDOW ^ WS_THICKFRAME ^ WS_MAXIMIZEBOX, // Non-resizable
        CW_USEDEFAULT, CW_USEDEFAULT, 600, 500,
        NULL, NULL, hInstance, NULL
    );

    if (hwnd == NULL) return 0;

    ShowWindow(hwnd, nCmdShow);

    MSG msg = { };
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return 0;
}