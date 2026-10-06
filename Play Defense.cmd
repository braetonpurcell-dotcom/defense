@echo off
rem Double-click to play Defense in your browser. Keep the window open while playing.
title Defense - game server
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File tools\serve.ps1 -Open
