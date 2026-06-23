@echo off
title C++-Mini-Project GUI Compiler

echo =======================================
echo Building the C++ Desktop GUI App
echo =======================================

if not exist bin mkdir bin

:: 1. Check if CL (MSVC) is already in PATH
where cl >nul 2>nul
if %errorlevel% equ 0 goto compile_msvc

:: 2. Auto-detect Visual Studio environment via vswhere
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if exist "%VSWHERE%" (
    echo [*] Looking for Visual Studio installation...
    for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
        set "VS_PATH=%%i"
    )
)

if defined VS_PATH (
    echo [+] Auto-Detected Visual Studio at: %VS_PATH%
    echo [+] Initializing MSVC Environment...
    call "%VS_PATH%\VC\Auxiliary\Build\vcvars64.bat"
    goto compile_msvc
)

:: 3. Check for g++ (MinGW) as fallback
where g++ >nul 2>nul
if %errorlevel% equ 0 goto compile_mingw

echo.
echo [!] NO COMPILER FOUND.
echo You must install a C++ compiler. Since you're on Windows:
echo 1. Install 'Visual Studio Build Tools' via the Visual Studio Installer.
echo 2. OR Install MinGW (g++).
echo.
pause
exit /b 1

:compile_msvc
echo [MSVC] Compiling using Microsoft Visual Studio...
cl.exe /EHsc /MD src\gui_main.cpp /link user32.lib gdi32.lib /OUT:bin\QuizGUI.exe
if %errorlevel% neq 0 goto error
del gui_main.obj
goto success

:compile_mingw
echo [MinGW] Compiling using g++...
g++ -std=c++17 -mwindows src\gui_main.cpp -o bin\QuizGUI.exe
if %errorlevel% neq 0 goto error
goto success


:error
echo.
echo [!] Build Failed! Look at the errors above.
pause
exit /b 1

:success
echo.
echo [+] Build Successful!
echo [+] Executable created at bin\QuizGUI.exe
echo.
echo Launching the application...
echo ---------------------------------------

start bin\QuizGUI.exe

pause
