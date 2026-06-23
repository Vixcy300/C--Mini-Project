@echo off
setlocal
title C++-Mini-Project Compiler

echo =======================================
echo Building the Adaptive C++ Quiz System
echo =======================================

if not exist bin mkdir bin

set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "VSINSTALL="

for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -products * -requires Microsoft.Component.MSBuild -property installationPath`) do set "VSINSTALL=%%i"

if not defined VSINSTALL (
    set "VSINSTALL=C:\Program Files\Microsoft Visual Studio\18\Community"
)

call "%VSINSTALL%\VC\Auxiliary\Build\vcvars64.bat" >nul

cl /nologo /EHsc /std:c++17 src\main.cpp /Fe:bin\QuizApp.exe

if errorlevel 1 (
    echo.
    echo [!] Build Failed! Visual C++ compiler could not build the project.
    pause
    exit /b %errorlevel%
)

echo.
echo [+] Build Successful!
echo [+] Executable created at bin\QuizApp.exe
echo.
echo Launching the application...
echo ---------------------------------------

bin\QuizApp.exe

pause
