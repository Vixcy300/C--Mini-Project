#ifndef INPUT_CHECKER_H
#define INPUT_CHECKER_H

#include <iostream>
#include <string>
#include <limits>
#include <regex>

namespace Colors {
    const std::string RED = "\033[31m";
    const std::string GREEN = "\033[32m";
    const std::string YELLOW = "\033[33m";
    const std::string CYAN = "\033[36m";
    const std::string RESET = "\033[0m";
}

// Outstanding Feature 1: Robust Input Validation System
class InputChecker {
public:
    // Ensures the user enters a valid integer within a specific range, preventing infinite loops or crashes
    static int getInt(const std::string& prompt, int minVal, int maxVal) {
        int input;
        while (true) {
            std::cout << Colors::CYAN << prompt << Colors::RESET;
            if (std::cin >> input) {
                if (input >= minVal && input <= maxVal) {
                    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
                    return input;
                } else {
                    std::cout << Colors::RED << "[!] Error: Value must be between " << minVal << " and " << maxVal << ".\n" << Colors::RESET;
                }
            } else {
                std::cout << Colors::RED << "[!] Error: Invalid input. Please enter a valid numerical digit.\n" << Colors::RESET;
                std::cin.clear(); // Clears the error flag on cin
                std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // Skips to the next newline
            }
        }
    }

    // Ensures a valid non-empty string is given
    static std::string getString(const std::string& prompt) {
        std::string input;
        while (true) {
            std::cout << Colors::CYAN << prompt << Colors::RESET;
            std::getline(std::cin, input);
            
            // Trim leading/trailing whitespaces manually or just check emptiness
            if (!input.empty() && input.find_first_not_of(" \t") != std::string::npos) {
                return input;
            }
            std::cout << Colors::RED << "[!] Error: Input cannot be empty or just spaces.\n" << Colors::RESET;
        }
    }

    // Innovative Feature: Regex-based Email format evaluation as part of the Inputs Checker
    static std::string getEmail(const std::string& prompt) {
        // Very robust regex for standard emails
        std::regex email_regex(R"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)");
        std::string email;
        
        while (true) {
            email = getString(prompt);
            if (std::regex_match(email, email_regex)) {
                return email;
            }
            std::cout << Colors::RED << "[!] Error: Invalid email format. Use format standard (e.g., player@domain.com)\n" << Colors::RESET;
        }
    }
};

#endif