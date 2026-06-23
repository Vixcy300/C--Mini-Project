#include <iostream>
#include "InputChecker.h"
#include "QuizSystem.h"

// ASCII Art Logo
void displayMainMenu() {
    std::cout << "\n" << Colors::CYAN << R"(
       ____        __                     _              
      / __ \__  __/ /___  ___  ________  (_)___  ____ _  
     / /_/ / / / / / __ \/ _ \/ ___/ _ \/ / __ \/ __ `/  
    / _, _/ /_/ / / /_/ /  __/ /  /  __/ / / / / /_/ /   
   /_/ |_|\__,_/_/ .___/\___/_/   \___/_/_/ /_/\__, /    
                /_/                           /____/     
    )" << "\n";
    std::cout << Colors::GREEN << "      The Ultimate Adaptive C++ Quiz System\n" << Colors::RESET;
    std::cout << "--------------------------------------------------------\n";
    std::cout << "1. Verify Profile & Enter the Arena\n";
    std::cout << "2. Exit to Desktop\n";
    std::cout << "--------------------------------------------------------\n";
}

int main() {
    // Flush the console purely for a clean aesthetic start (Optional, but looks nice)
    std::cout << "\033[2J\033[1;1H"; 

    while (true) {
        displayMainMenu();
        
        // Use our robust Input Checker
        int choice = InputChecker::getInt("Select your command [1-2]: ", 1, 2);

        if (choice == 1) {
            std::cout << "\n" << Colors::YELLOW << "--- Registration Portal ---\n" << Colors::RESET;
            
            // Require non-empty string and proper email regex via our Input Checker
            std::string username = InputChecker::getString("Enter your Agent Username: ");
            std::string email = InputChecker::getEmail("Enter your Registration Email: ");
            
            QuizSystem gameEngine;
            gameEngine.startQuiz(username);

        } else if (choice == 2) {
            std::cout << "\n" << Colors::YELLOW << "Shutting down the terminal. Goodbye!\n\n" << Colors::RESET;
            break;
        }
    }
    
    return 0;
}