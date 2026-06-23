export const questionsData = {
  easy: [
    {
      text: "What is the core ideology behind C++?",
      options: ["Procedural only", "Object-Oriented only", "Multi-paradigm", "Functional only"],
      correctIndex: 3,
      feedback: "C++ supports procedural, OOP, generic (templates), and functional programming paradigms, making it multi-paradigm."
    },
    {
      text: "Which operator is used to allocate dynamic memory in C++?",
      options: ["malloc", "alloc", "new", "pointer"],
      correctIndex: 3,
      feedback: "'new' is the standard operator for dynamic memory allocation in C++. It also calls the object's constructor."
    },
    {
      text: "Which header file is needed for using standard input/output streams?",
      options: ["<iostream>", "<stdio.h>", "<stream>", "<input>"],
      correctIndex: 1,
      feedback: "<iostream> defines standard input/output stream objects like std::cin and std::cout."
    },
    {
      text: "How do you start a single-line comment in C++?",
      options: ["# comment", "// comment", "/* comment", "<!-- comment -->"],
      correctIndex: 2,
      feedback: "// is used for single-line comments in C++, whereas /* ... */ is for multi-line comments."
    },
    {
      text: "Which keyword is used to define a constant variable whose value cannot change?",
      options: ["const", "constant", "readonly", "static"],
      correctIndex: 1,
      feedback: "'const' tells the compiler that the value of the variable cannot be modified after initialization."
    }
  ],
  medium: [
    {
      text: "What is the time complexity of binary search (worst-case)?",
      options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
      correctIndex: 3,
      feedback: "Binary search divides the search space in half at each step, yielding a logarithmic time complexity of O(log n)."
    },
    {
      text: "What does the 'virtual' keyword enable in C++?",
      options: ["Abstract classes", "Runtime polymorphism", "Memory packing", "Multiple inheritance"],
      correctIndex: 2,
      feedback: "Virtual methods enable dynamic dispatch (late binding) at runtime, which is the mechanism for runtime polymorphism."
    },
    {
      text: "What is the difference between a struct and a class in C++?",
      options: [
        "Classes cannot have methods, while structs are allowed to",
        "Structs have default public members; classes default to private",
        "Classes are stored on the heap, structs are on the stack",
        "There are no differences in access control and inheritance"
      ],
      correctIndex: 2,
      feedback: "In C++, the only difference is default access controls: struct defaults to public; class defaults to private."
    },
    {
      text: "Which STL container is guaranteed to be stored as a contiguous array in memory?",
      options: ["std::list", "std::vector", "std::deque", "std::map"],
      correctIndex: 2,
      feedback: "std::vector stores elements contiguously, meaning elements can be accessed using raw pointers and offsets."
    },
    {
      text: "What does RAII stand for in C++ design patterns?",
      options: [
        "Run-time Allocation Is Immediate context",
        "Resource Acquisition Is Initialization rule",
        "Recursive Algorithm In Order execution",
        "Reference Allocation Is Internal storage"
      ],
      correctIndex: 2,
      feedback: "RAII stands for Resource Acquisition Is Initialization, where resource lifecycle (files, heap memory) is bound to object lifetime."
    }
  ],
  hard: [
    {
      text: "Which of the following is NOT a standard smart pointer in C++11?",
      options: ["std::unique_ptr", "std::shared_ptr", "std::weak_ptr", "std::scoped_ptr"],
      correctIndex: 4,
      feedback: "std::scoped_ptr is from the Boost library, not the C++11 standard. The standard uses std::unique_ptr for sole ownership."
    },
    {
      text: "What defines a 'constexpr' specifier?",
      options: [
        "Forces the compiler to execute code inside inline assembler",
        "Enables expressions to be evaluated strictly at compile time",
        "Instructs the hardware to cache variable values in registers",
        "Protects memory regions from being modified by other threads"
      ],
      correctIndex: 2,
      feedback: "constexpr instructs the compiler that the function or variable can be evaluated at compile time, improving runtime performance."
    },
    {
      text: "What is the rule of three (or rule of five) in C++ resource management?",
      options: [
        "Providing custom templates for every primitive data type",
        "Defining copy operations and destructor together if needed",
        "Making sure copy constructors use virtual base classes",
        "Inheriting from exactly three or five standard interfaces"
      ],
      correctIndex: 2,
      feedback: "The Rule of Three/Five states that if a class defines a destructor, copy constructor, or copy assignment operator, it likely manages a resource and needs to define all of them."
    },
    {
      text: "What does std::move actually do at runtime?",
      options: [
        "Performs byte-by-byte memory copying inside system RAM",
        "Converts an expression into an rvalue reference type",
        "Frees the memory of the original object automatically",
        "Copies object pointers to standard heap directories"
      ],
      correctIndex: 2,
      feedback: "std::move does not move anything at runtime; it compiles to a static cast to an rvalue reference, allowing the selection of overload functions that support move semantics."
    },
    {
      text: "What is template specialization in C++ templates?",
      options: [
        "Preventing templates from compilation on non-class types",
        "Customizing template behavior for a specific argument type",
        "Minimizing overall compilation overhead of nested functions",
        "Deriving static template rules from abstract base classes"
      ],
      correctIndex: 2,
      feedback: "Template specialization allows defining a custom behavior/implementation of a template when a specific data type is passed."
    }
  ]
};
