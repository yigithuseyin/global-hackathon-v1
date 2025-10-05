import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Upload, FileText, Eye, Target, Lightbulb, Sparkles, TrendingUp, RotateCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// --- GLOBAL LIBRARY DEPENDENCY NOTES (CRITICAL) ---
// For the DOCX and PDF parsing functions below to work, the following libraries
// MUST be loaded globally via script tags in the HTML file hosting this component:
// 
// 1. DOCX Parsing (mammoth.js):
//    <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.5.0/mammoth.browser.min.js"></script>
//    (This exposes the global 'mammoth' object)
//
// 2. PDF Parsing (pdf.js):
//    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
//    <script>pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';</script>
//    (This exposes the global 'pdfjsLib' object)
// ----------------------------------------------------

// Define the structure for the AI output
interface GeneratedOutput {
  text: string;
  style: string;
  sources: { uri: string; title: string }[];
}

// Global types for assumed CDN libraries to satisfy TypeScript (needed for single-file apps)
declare const mammoth: {
  extractRawText: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
};
declare const pdfjsLib: {
  getDocument: (options: { data: Uint8Array }) => { promise: Promise<any> };
  GlobalWorkerOptions: { workerSrc: string };
};


const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Retrieve learning style, default to 'visual'
  const learningStyle = localStorage.getItem("learningStyle") || "visual";
  
  // State for tracking successfully uploaded/processed files
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]); 
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // New states for AI generation process
  const [isLoading, setIsLoading] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const learningStyleInfo = {
    visual: {
      icon: Eye,
      title: "Visual Learner",
      description: "You learn best through diagrams, charts, and visual representations",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    practical: {
      icon: Target,
      title: "Practical Learner",
      description: "You excel with real-world examples and hands-on practice",
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    conceptual: {
      icon: Lightbulb,
      title: "Conceptual Learner",
      description: "You thrive on understanding theories and underlying principles",
      color: "text-accent",
      bg: "bg-accent/10",
    },
  };

  const currentStyle = learningStyleInfo[learningStyle as keyof typeof learningStyleInfo];
  const StyleIcon = currentStyle.icon;

  // Utility to read file as ArrayBuffer, necessary for binary file parsing
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as ArrayBuffer);
      };
      reader.onerror = (error) => {
        reject(new Error(`Failed to read file as ArrayBuffer: ${file.name}`));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // --- NEW: DOCX Parsing Function (Relies on global 'mammoth' object) ---
  const parseDocx = async (file: File): Promise<string> => {
    if (typeof mammoth === 'undefined') {
      throw new Error("DOCX parser (mammoth.js) is not loaded. Check the CDN script tag in your HTML.");
    }
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  // --- NEW: PDF Parsing Function (Relies on global 'pdfjsLib' object) ---
  const parsePdf = async (file: File): Promise<string> => {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF parser (pdf.js) is not loaded. Check the CDN script tags in your HTML.");
    }

    const arrayBuffer = await readFileAsArrayBuffer(file);
    const data = new Uint8Array(arrayBuffer);
    
    // Asynchronously load the PDF document
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    let fullText = '';
    // Loop through all pages and extract text
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text items and join them, adding a newline between pages
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };
  
  // Utility to read file content as text (now supports TXT, DOCX, PDF)
  const readFileAsText = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase();
    const isTxt = fileName.endsWith('.txt');
    const isDocx = fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';

    let content: string;
    
    // --- Handling Plain Text (.txt) ---
    if (isTxt) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          content = event.target?.result as string;
          // Simple truncation for large files as an MVP safety measure
          resolve(content.substring(0, 50000)); 
        };
        reader.onerror = (error) => {
          reject(new Error(`Failed to read TXT file: ${file.name}`));
        };
        reader.readAsText(file);
      });
    }
    
    // --- Handling Binary Files (.docx, .pdf) ---
    try {
      if (isDocx) {
        content = await parseDocx(file);
      } else if (isPdf) {
        content = await parsePdf(file);
      } else {
        // --- Handling Other Unsupported Files ---
        throw new Error(`Unsupported file type: ${file.name}. Only .txt, .docx, and .pdf are supported.`);
      }

      // Apply truncation and resolve for DOCX/PDF
      return content.substring(0, 50000);
      
    } catch (error) {
      // Re-throw the specific error from the parser
      throw error; 
    }
  };

  // Function to call the Gemini API with exponential backoff
  const generateContentWithGemini = async (content: string, style: string): Promise<{ text: string; sources: any[] }> => {
    let systemPrompt = "";
    let userQuery = `Based on the following study material, create a personalized study aid for a ${style} learner. The content should focus on key concepts and actionable learning points.`;

    // Adaptive Prompting Logic
    if (style === "visual") {
      systemPrompt = "You are an expert tutor creating a structured study guide for a visual learner. Your output MUST be formatted using markdown to emphasize visual structure: use bullet points, numbered lists, tables, and clear headings. For every main concept, suggest a simple visual representation (like a flowchart, diagram, or mind-map structure) that the learner can draw.";
    } else if (style === "practical") {
      systemPrompt = "You are an expert tutor creating a practical study guide focused on application for a hands-on learner. Your output MUST include at least three detailed, real-world examples or case studies that demonstrate how the core concepts are used in practice. Also, include a short practice scenario or question.";
    } else if (style === "conceptual") {
      systemPrompt = "You are an expert tutor creating a conceptual study guide for a learner who thrives on understanding deep theories. Your output MUST clearly define the underlying principles and explain the relationships between the main ideas, using strong analogies if possible. Explain the 'Why' behind the facts.";
    }

    userQuery += "\n\nMaterial to study:\n" + content;

    // --- API Key Handling ---
    const apiKey = "AIzaSyAilDoFYsZpPd1lZmSsIYR6pE-M3WnNnp8"; // The environment automatically injects the secure API key
    const model = "gemini-2.5-flash-preview-05-20";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const MAX_RETRIES = 3;
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          // If response fails, throw error to trigger retry or final catch
          throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
          const text = candidate.content.parts[0].text;
          
          let sources = [];
          const groundingMetadata = candidate.groundingMetadata;
          if (groundingMetadata && groundingMetadata.groundingAttributions) {
              sources = groundingMetadata.groundingAttributions
                  .map((attribution: any) => ({
                      uri: attribution.web?.uri,
                      title: attribution.web?.title,
                  }))
                  .filter((source: any) => source.uri && source.title);
          }

          return { text, sources };
        } else {
          throw new Error("Invalid response structure from Gemini API.");
        }

      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        attempt++;
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 2s, 4s, 8s delay before next attempt
          const delay = Math.pow(2, attempt) * 1000; 
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Final failure after all retries
          throw new Error("Failed to generate content after multiple retries.");
        }
      }
    }
    // Fallback if the loop somehow completes without returning or throwing
    throw new Error("Failed to generate content.");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
      toast({
        title: "Files selected",
        description: `${files.length} file(s) ready to process`,
      });
    }
  };

  const handleCreateStudyAid = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setGeneratedOutput(null); // Clear previous output
    const file = selectedFiles[0]; // Process only the first file for MVP

    toast({
      title: "Creating study aid...",
      description: `1. Reading file: ${file.name}`,
    });

    try {
      // 1. Read file content (uses the refactored, multi-format utility)
      const fileContent = await readFileAsText(file);
      
      toast({
        title: "Creating study aid...",
        description: `2. Generating personalized content for ${currentStyle.title}...`,
      });

      // 2. Call AI Generation
      const result = await generateContentWithGemini(fileContent, learningStyle);

      // 3. Update State on Success
      setGeneratedOutput({
        text: result.text,
        style: currentStyle.title,
        sources: result.sources,
      });

      // Update file state and clear selection
      setUploadedFiles(prev => [...prev, file.name]); 
      setSelectedFiles([]); 

      toast({
        title: "Success!",
        description: "Your personalized study aid is ready.",
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Generation Failed",
        // Display the specific error message, including potential missing library errors
        description: (error as Error).message || "An unexpected error occurred during AI processing.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder function for the MVP feedback loop
  const handleFeedback = (isHelpful: boolean) => {
    console.log(`Feedback received: ${isHelpful ? 'Helpful' : 'Not Helpful'} for style: ${learningStyle}`);
    toast({
        title: "Feedback Recorded",
        description: `Thank you! This helps us refine content for ${learningStyle} learners.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LearnMate AI
            </h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Home
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back!</h2>
          <p className="text-muted-foreground">
            Your personalized learning hub is ready
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Learning Profile Card */}
          <Card className="md:col-span-2 shadow-card border-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${currentStyle.bg}`}>
                  <StyleIcon className={`w-6 h-6 ${currentStyle.color}`} />
                </div>
                <div>
                  <CardTitle>{currentStyle.title}</CardTitle>
                  <CardDescription>{currentStyle.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Profile Confidence</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <p className="text-sm text-muted-foreground">
                  As you use LearnMate, we'll continue refining your learning profile based on
                  what works best for you.
                </p>
                <Button variant="outline" onClick={() => navigate("/onboarding")}>
                  Retake Assessment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="shadow-card border-2">
            <CardHeader>
              <CardTitle className="text-lg">Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uploadedFiles.length}</p>
                  <p className="text-xs text-muted-foreground">Materials Uploaded</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Sparkles className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  {/* Shows count based on successful generations */}
                  <p className="text-2xl font-bold">{generatedOutput ? uploadedFiles.length : 0}</p> 
                  <p className="text-xs text-muted-foreground">AI Outputs Generated</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">New</p>
                  <p className="text-xs text-muted-foreground">User Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card className="shadow-glow border-2 border-dashed border-primary/50 bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Upload className="w-6 h-6 text-primary" />
              Upload Learning Materials
            </CardTitle>
            <CardDescription>
              Upload your notes, slides, or PDFs to get personalized study aids
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              // Now officially accepts .pdf and .docx
              accept=".pdf,.txt,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/30 rounded-lg p-12 text-center hover:border-primary/60 transition-smooth cursor-pointer bg-background/50"
            >
              <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Drop files here or click to browse</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Full support for **TXT**, and new parsing logic for **DOCX** and **PDF**.
              </p>
              {selectedFiles.length > 0 && (
                <p className="text-sm font-medium text-primary mb-4">
                  {selectedFiles.length} file(s) selected: {selectedFiles.map(f => f.name).join(", ")}
                </p>
              )}
              <Button variant="hero" size="lg" type="button">
                Choose Files
              </Button>
            </div>
            <Button 
              onClick={handleCreateStudyAid}
              disabled={selectedFiles.length === 0 || isLoading}
              className="w-full mt-4"
              size="lg"
            >
              {isLoading ? (
                <RotateCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              {isLoading ? `Generating for ${currentStyle.title}...` : 'Create Study Aid'}
            </Button>
            {uploadedFiles.length === 0 && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  💡 Tip: Start by uploading lecture notes or study materials to see AI-generated
                  content tailored to your learning style
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Study Aid Output Section (NEW) */}
        {(isLoading || generatedOutput) && (
          <Card className="mt-8 shadow-card border-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-secondary" />
                    AI-Generated Study Aid
                </CardTitle>
                {generatedOutput && (
                  <div className={`px-3 py-1 text-sm font-medium rounded-full ${currentStyle.bg} ${currentStyle.color}`}>
                    For {generatedOutput.style} Learners
                  </div>
                )}
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex flex-col items-center justify-center p-12">
                  <RotateCw className="w-8 h-8 text-primary animate-spin mb-4" />
                  <p className="text-lg font-medium text-primary">Generating Content...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This may take a moment while the AI analyzes your material and creates the personalized aid.
                  </p>
                </div>
              )}
              {generatedOutput && (
                <div className="prose max-w-none">
                  {/* Display the raw markdown text in a scrollable block */}
                  <div className="whitespace-pre-wrap p-6 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200 shadow-inner max-h-[50vh] overflow-y-auto">
                    {generatedOutput.text}
                  </div>
                  
                  {/* Simple feedback loop MVP */}
                  <div className="mt-6 flex items-center justify-between p-4 bg-success/10 border border-success/30 rounded-lg">
                    <p className="font-medium text-sm text-success-foreground">Was this helpful?</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="bg-white hover:bg-success/20" onClick={() => handleFeedback(true)}>👍 Yes</Button>
                      <Button variant="outline" size="sm" className="bg-white hover:bg-destructive/20" onClick={() => handleFeedback(false)}>👎 No</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Recent Materials Section */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">Recent Materials</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedFiles.map((file, index) => (
                <Card key={index} className="shadow-card hover:shadow-md transition-smooth">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <CardTitle className="text-base">{file}</CardTitle>
                        <CardDescription>Generated: {new Date().toLocaleDateString()}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      View Generated Content (Placeholder)
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
