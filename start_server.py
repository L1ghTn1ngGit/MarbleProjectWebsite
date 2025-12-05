#!/usr/bin/env python3
"""
Simple HTTP Server for NYC Budget Dashboard
Run this script to view the dashboard in your browser
"""

import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow file access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    # Change to the script's directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("=" * 60)
    print("🚀 NYC Budget Transparency Dashboard Server")
    print("=" * 60)
    print(f"\n📂 Serving files from: {script_dir}")
    print(f"🌐 Server running at: http://localhost:{PORT}")
    print(f"\n✨ Opening dashboard in your browser...\n")
    print("💡 Press Ctrl+C to stop the server")
    print("=" * 60 + "\n")
    
    # Open browser after a short delay
    import threading
    def open_browser():
        import time
        time.sleep(1.5)
        webbrowser.open(f'http://localhost:{PORT}/index.html')
    
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Start server
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped. Thanks for using NYC Budget Dashboard!")
            httpd.shutdown()

if __name__ == "__main__":
    main()
