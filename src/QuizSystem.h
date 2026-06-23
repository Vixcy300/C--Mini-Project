#ifndef QUIZ_SYSTEM_H
#define QUIZ_SYSTEM_H

#include <string>
#include <vector>
#include <iostream>
#include <algorithm>
#include <random>
#include "InputChecker.h"

enum class Difficulty { EASY, MEDIUM, HARD };

struct Question {
    std::string text;
    std::vector<std::string> options;
    int correctIndex; // 1-based index
    Difficulty difficulty;
    std::string feedback; 
};

// Outstanding Feature 2: Adaptive Learning & Streaks Multipliers
class QuizSystem {
private:
    std::vector<Question> questionBank;
    int score;
    int streak;
    Difficulty currentDifficulty;

public:
    QuizSystem() : score(0), streak(0), currentDifficulty(Difficulty::EASY) {
        loadQuestions();
    }

    void loadQuestions() {
        // --- EASY LEVEL ---
        questionBank.push_back({"What is the core ideology behind C++?", {"Procedural only", "Object-Oriented only", "Multi-paradigm", "Functional only"}, 3, Difficulty::EASY, "C++ supports procedural, OOP, and generic programming."});
        questionBank.push_back({"Which operator is used to allocate dynamic memory?", {"malloc", "alloc", "new", "pointer"}, 3, Difficulty::EASY, "'new' is the standard operator for dynamic memory allocation in C++."});
        
        // --- MEDIUM LEVEL ---
        questionBank.push_back({"What is the time complexity of binary search (worst-case)?", {"O(1)", "O(n)", "O(log n)", "O(n^2)"}, 3, Difficulty::MEDIUM, "Binary search divides the array in half per step, giving logarithmic complexity."});
        questionBank.push_back({"What does the 'virtual' keyword enable?", {"Abstract classes", "Runtime polymorphism", "Memory packing", "Multiple inheritance"}, 2, Difficulty::MEDIUM, "Virtual methods enable dynamic dispatch (late binding)."});

        // --- HARD LEVEL ---
        questionBank.push_back({"Which of the following is NOT a standard smart pointer in C++11?", {"std::unique_ptr", "std::shared_ptr", "std::weak_ptr", "std::scoped_ptr"}, 4, Difficulty::HARD, "std::scoped_ptr is from the Boost library, not the C++11 standard."});
        questionBank.push_back({"What defines a 'constexpr'?", {"A macro optimization", "Evaluated strictly at compile time", "Forces inline assembly", "Read-only memory marker"}, 2, Difficulty::HARD, "constexpr instructs the compiler to evaluate the expression at compile time."});
    }

    int getPointsMultiplier() {
        // Base points depend on the current difficulty
        int base = (currentDifficulty == Difficulty::EASY) ? 10 : (currentDifficulty == Difficulty::MEDIUM) ? 30 : 50;
        
        // Streak bonus multiplier triggers!
        int streakBonus = streak * 5; 
        return base + streakBonus;
    }

    void startQuiz(const std::string& username) {
        score = 0;
        streak = 0;
        currentDifficulty = Difficulty::EASY;
        
        std::cout << "\n" << Colors::GREEN << "=============================================\n";
        std::cout << "  Welcome, " << username << ", to the ADAPTIVE QUIZ ARENA!\n";
        std::cout << "=============================================\n" << Colors::RESET;
        std::cout << "Rules:\n"
                  << "- Answer correctly: Game gets HARDER (+ Huge points!).\n"
                  << "- Answer wrong: Game scales back to EASY.\n"
                  << "- Answer correctly in a row to rack up STREAK COMBO bonuses!\n\n";

        int questionsAsked = 0;
        int maxQuestions = 5; // Play 5 rounds per game

        std::random_device rd;
        std::mt19937 randomEngine(rd());

        while (questionsAsked < maxQuestions) {
            // Filter available questions by our currently adapted difficulty!
            std::vector<Question> pool;
            for (const auto& q : questionBank) {
                if (q.difficulty == currentDifficulty) {
                    pool.push_back(q);
                }
            }

            if (pool.empty()) break; 

            // Shuffle the difficulty pool and pick one
            std::shuffle(pool.begin(), pool.end(), randomEngine);
            Question currentQ = pool.front();

            std::cout << "\n" << Colors::YELLOW << "--- Round " << (questionsAsked + 1) << " / " << maxQuestions << " ---" << Colors::RESET << "\n";
            
            std::string diffStr = (currentDifficulty == Difficulty::EASY) ? "EASY" : (currentDifficulty == Difficulty::MEDIUM) ? "MEDIUM" : "HARD";
            std::cout << Colors::CYAN << "[Level: " << diffStr << " | Score: " << score << " | Streak Combo: " << streak << "x]\n" << Colors::RESET;
            std::cout << "\nQ: " << currentQ.text << "\n\n";

            for (size_t i = 0; i < currentQ.options.size(); ++i) {
                std::cout << "  [" << (i + 1) << "] " << currentQ.options[i] << "\n";
            }

            // Calls our Outstanding GUI Input Checker
            std::cout << "\n";
            int ans = InputChecker::getInt(">> Your answer (1-" + std::to_string(currentQ.options.size()) + "): ", 1, currentQ.options.size());

            if (ans == currentQ.correctIndex) {
                int pointsEarned = getPointsMultiplier();
                score += pointsEarned;
                streak++;
                std::cout << Colors::GREEN << "\n[CORRECT!] +" << pointsEarned << " points! " << Colors::RESET << currentQ.feedback << "\n";
                
                // Adaptive Logic: Escalate Difficutly
                if (currentDifficulty == Difficulty::EASY) currentDifficulty = Difficulty::MEDIUM;
                else if (currentDifficulty == Difficulty::MEDIUM) currentDifficulty = Difficulty::HARD;

            } else {
                streak = 0; // Break Streak
                std::cout << Colors::RED << "\n[WRONG!] The correct answer was option " << currentQ.correctIndex << ". " << Colors::RESET << currentQ.feedback << "\n";
                
                // Adaptive Logic: Drop Difficulty 
                if (currentDifficulty == Difficulty::HARD) currentDifficulty = Difficulty::MEDIUM;
                else if (currentDifficulty == Difficulty::MEDIUM) currentDifficulty = Difficulty::EASY;
            }
            questionsAsked++;
            
            std::cout << "Press Enter to continue...";
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        }

        // Output Final Screen
        std::cout << "\n" << Colors::GREEN << "=============================================\n";
        std::cout << "  QUIZ COMPLETED!\n";
        std::cout << "  Final Score: " << score << " points\n";
        std::cout << "  Well done, " << username << "!\n";
        std::cout << "=============================================\n" << Colors::RESET;
    }
};

#endif