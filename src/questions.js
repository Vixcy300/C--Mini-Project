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
    },
    {
      text: "What is the purpose of '#pragma once' in C++ header files?",
      options: ["Allocates static memory", "Prevents double inclusion of header files", "Loads external binary assemblies", "Optimizes template compilation speed"],
      correctIndex: 2,
      feedback: "'#pragma once' is a widely supported preprocessor directive designed to cause the current source file to be included only once in a single compilation."
    },
    {
      text: "Which manipulator is used to print boolean values as 'true' or 'false' instead of '1' or '0'?",
      options: ["std::boolalpha", "std::showbool", "std::setformat", "std::boolean"],
      correctIndex: 1,
      feedback: "'std::boolalpha' is an I/O manipulator that formats boolean values as text representation ('true' / 'false')."
    },
    {
      text: "How do you declare a reference variable 'ref' to an integer variable 'x'?",
      options: ["int* ref = &x;", "int& ref = x;", "int ref = *x;", "int ref = &x;"],
      correctIndex: 2,
      feedback: "A reference is declared using the '&' symbol after the type, e.g. 'int& ref = x;'. It acts as an alias to the original variable."
    },
    {
      text: "Which operator is used to access a global variable when a local variable with the same name exists?",
      options: [":: (scope resolution)", ". (dot operator)", "-> (arrow operator)", "* (dereference)"],
      correctIndex: 1,
      feedback: "The scope resolution operator '::' without a class name prefix accesses identifiers in the global namespace scope."
    },
    {
      text: "Which stream is used to print error messages that should bypass standard output buffering?",
      options: ["std::cout", "std::cin", "std::cerr", "std::clog"],
      correctIndex: 3,
      feedback: "'std::cerr' is the standard error stream in C++ and is unbuffered, meaning it displays messages immediately on screen."
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
    },
    {
      text: "In derived classes, in what order are destructors executed during destruction?",
      options: ["Derived class first, then base class", "Base class first, then derived class", "Both destructors run simultaneously", "Only the base class destructor is run"],
      correctIndex: 1,
      feedback: "Destructors are executed in the reverse order of constructors: Derived class destructor runs first, then the Base class destructor."
    },
    {
      text: "What is the correct parameter signature for a copy constructor in a class named 'Widget'?",
      options: ["Widget(Widget w);", "Widget(Widget* w);", "Widget(const Widget& w);", "Widget(Widget&& w);"],
      correctIndex: 3,
      feedback: "A copy constructor takes a reference to const object 'Widget(const Widget&)', avoiding infinite recursion that would happen if passed by value."
    },
    {
      text: "Which operator must be used to free memory allocated with 'int* arr = new int[50];'?",
      options: ["delete arr;", "free(arr);", "delete[] arr;", "release(arr);"],
      correctIndex: 3,
      feedback: "For arrays allocated with 'new[]', you must use 'delete[]' to ensure destructors run for all array elements and the correct array memory block is freed."
    },
    {
      text: "What happens to a local variable declared with the 'static' keyword inside a C++ function?",
      options: [
        "It is re-initialized every time the function is executed",
        "It retains its value between function calls and is initialized once",
        "It is allocated on the dynamic heap instead of the stack",
        "It becomes accessible to any external translation unit file"
      ],
      correctIndex: 2,
      feedback: "A static local variable is initialized once when control first passes through its declaration, and retains its value between subsequent function calls."
    },
    {
      text: "What is function overloading in C++?",
      options: [
        "Redefining a base class method with the exact same signature in a derived class",
        "Having multiple functions with the same name but different parameter list signatures",
        "Binding virtual methods at runtime based on the actual object type",
        "Declaring a class method with a constexpr constraint inside a structure"
      ],
      correctIndex: 2,
      feedback: "Function overloading allows multiple functions in the same scope to share a name, provided they have different parameter counts or types."
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
    },
    {
      text: "Which syntax is used to declare an rvalue reference to an integer parameter?",
      options: ["int& x", "int&& x", "int* x", "const int& x"],
      correctIndex: 2,
      feedback: "An rvalue reference is declared using double ampersand syntax 'int&&'. It represents a temporary object that can be moved from."
    },
    {
      text: "What is the primary purpose of the 'std::forward' utility function template in C++ templates?",
      options: [
        "To cast an expression to a raw pointer type safely",
        "To preserve the value category (lvalue/rvalue) of arguments when forwarding them",
        "To run template methods in background threads asynchronously",
        "To convert derived class instances to abstract interfaces"
      ],
      correctIndex: 2,
      feedback: "'std::forward' is used to implement perfect forwarding in templates, casting arguments to their original value category (maintaining lvalue-ness or rvalue-ness)."
    },
    {
      text: "What does the 'explicit' specifier do when applied to a single-parameter constructor?",
      options: [
        "Prevents the constructor from being used for implicit type conversions",
        "Forces the compiler to inline the constructor body at call sites",
        "Makes the class constructor callable from static methods only",
        "Requires the class object to be constructed on the stack"
      ],
      correctIndex: 1,
      feedback: "The 'explicit' keyword prevents the compiler from performing implicit conversions or copy-initializations using that constructor."
    },
    {
      text: "What is the prefix syntax used to declare a full template specialization in C++?",
      options: ["template <class T>", "template <>", "specialize <T>", "template <special>"],
      correctIndex: 2,
      feedback: "A full template specialization is introduced by the 'template <>' prefix, indicating all template parameters are specialized for a specific type."
    },
    {
      text: "What is 'object slicing' in C++ inheritance?",
      options: [
        "Dividing class memory into discrete cache-aligned bytes",
        "Passing a derived class object by value to a base class parameter, losing derived-specific data",
        "Splitting a structure into multiple independent templates",
        "Allocating subclass structures across multiple static arrays"
      ],
      correctIndex: 2,
      feedback: "Object slicing occurs when a derived class object is assigned to or passed as a base class object by value. The derived class parts are 'sliced off' and lost."
    }
  ]
};
