"use client";

import { useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Download } from "lucide-react";

export default function OnboardingPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setIsUploading(true);
    
    // Simulate parsing CSV and sending invites
    setTimeout(() => {
      setIsUploading(false);
      setSuccess(true);
      setFile(null);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Employee Onboarding</h1>
        <p className="text-muted-foreground mt-1">Bulk invite employees to your organization via CSV.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Upload Area */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Upload Employee Roster</h2>
            
            {success ? (
              <div className="flex flex-col items-center justify-center p-8 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900/30 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-green-800 dark:text-green-400 mb-2">Upload Successful!</h3>
                <p className="text-green-700 dark:text-green-500/80 mb-6">
                  Successfully imported 42 employees. Invitation emails have been sent out.
                </p>
                <button 
                  onClick={() => setSuccess(false)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Upload Another File
                </button>
              </div>
            ) : (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                }`}
              >
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  {file ? (
                    <FileText className="w-8 h-8 text-primary" />
                  ) : (
                    <UploadCloud className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                
                <h3 className="text-lg font-semibold mb-2">
                  {file ? file.name : 'Drag & Drop your CSV file here'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  {file 
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : 'File must contain headers: email, full_name, team_name.'}
                </p>
                
                {file ? (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setFile(null)}
                      className="px-4 py-2 border border-border text-foreground bg-card rounded-lg hover:bg-muted font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUploading && (
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      )}
                      {isUploading ? 'Processing...' : 'Upload & Invite'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <input 
                      type="file" 
                      id="file-upload" 
                      accept=".csv" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setFile(e.target.files[0]);
                        }
                      }}
                    />
                    <label 
                      htmlFor="file-upload"
                      className="px-6 py-3 bg-card border border-border rounded-lg shadow-sm font-medium hover:bg-muted transition-colors cursor-pointer"
                    >
                      Browse Files
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Instructions Sidebar */}
        <div className="space-y-6">
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Download size={18} className="text-primary" />
              CSV Template
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Download our template to ensure your employee data is formatted correctly before uploading.
            </p>
            <button className="w-full py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
              Download Template
            </button>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-xl shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-3 text-amber-800 dark:text-amber-500">
              <AlertCircle size={18} />
              Important Rules
            </h3>
            <ul className="text-sm text-amber-700 dark:text-amber-500/80 space-y-2 list-disc pl-5">
              <li>Max 500 employees per upload.</li>
              <li>Emails must use your official corporate domain.</li>
              <li>Duplicate emails will be ignored automatically.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
