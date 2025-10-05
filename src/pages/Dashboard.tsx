import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Upload, FileText, Eye, Target, Lightbulb, Sparkles, TrendingUp, RotateCw, CheckCircle, XCircle, ChevronRight, Zap, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// --- GLOBAL LIBRARY DEPENDENCY NOTES (CRITICAL) ---
// These global objects are required for DOCX and PDF parsing:
// 1. DOCX Parsing (mammoth.js): requires global 'mammoth' object.
// 2. PDF Parsing (pdf.js): requires global 'pdfjsLib' object.
// ----------------------------------------------------

// Define the structure for the AI output
interface GeneratedOutput {
  text: string;
  style: string;
  sources: { uri: string; title: string }[];
}

// Define Quiz Interface
interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation_visual: string;
  explanation_practical: string;
  explanation_conceptual: string;
}

// Global types for assumed CDN libraries to satisfy TypeScript (needed for single-file apps)
declare const mammoth: {
  extractRawText: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
};
declare const pdfjsLib: {
  getDocument: (options: { data: Uint8Array }) => { promise: Promise<any> };
  GlobalWorkerOptions: { workerSrc: string };
};

// Learning Style Utility
const learningStylesArray = ['visual', 'practical', 'conceptual'];

const getNextStyle = (current: string, styles: string[]) => {
  const currentIndex = styles.indexOf(current);
  const nextIndex = (currentIndex + 1) % styles.length;
  return styles[nextIndex];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for tracking and updating the current learning style dynamically
  const [currentLearningStyle, setCurrentLearningStyle] = useState(
    localStorage.getItem("learningStyle") || "visual"
  );
  
  // NEW: State for tracking the profile confidence score
  const [profileConfidence, setProfileConfidence] = useState(85); // Initial confidence is 85%

  // State for tracking successfully uploaded/processed files
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]); 
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // States for AI generation process
  const [isLoading, setIsLoading] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);

  // States for Quiz feature
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null); // Array of 5 questions
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Which question is active
  const currentQuiz = quizQuestions ? quizQuestions[currentQuestionIndex] : null; // The active question
  
  const [quizStatus, setQuizStatus] = useState<'waiting' | 'correct' | 'incorrect' | 'unanswered' | 'completed'>('unanswered');
  const [userSelection, setUserSelection] = useState<number | null>(null);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState(0);


  const fileInputRef = useRef<HTMLInputElement>(null);

  const learningStyleInfo = {
    visual: {
      icon: Eye,
      title: "Visual Learner",
      description: "You learn best through diagrams, charts, and visual representations",
      color: "text-primary",
      bg: "bg-primary/10",
      explanationKey: 'explanation_visual' as const,
    },
    practical: {
      icon: Target,
      title: "Practical Learner",
      description: "You excel with real-world examples and hands-on practice",
      color: "text-secondary",
      bg: "bg-secondary/10",
      explanationKey: 'explanation_practical' as const,
    },
    conceptual: {
      icon: Lightbulb,
      title: "Conceptual Learner",
      description: "You thrive on understanding theories and underlying principles",
      color: "text-accent",
      bg: "bg-accent/10",
      explanationKey: 'explanation_conceptual' as const,
    },
  };

  const currentStyle = learningStyleInfo[currentLearningStyle as keyof typeof learningStyleInfo];
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

  // --- DOCX and PDF Parsing Functions ---
  const parseDocx = async (file: File): Promise<string> => {
    if (typeof mammoth === 'undefined') {
      throw new Error("DOCX parser (mammoth.js) is not loaded. Check the CDN script tag in your HTML.");
    }
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const parsePdf = async (file: File): Promise<string> => {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF parser (pdf.js) is not loaded. Check the CDN script tags in your HTML.");
    }

    const arrayBuffer = await readFileAsArrayBuffer(file);
    const data = new Uint8Array(arrayBuffer);
    
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };
  
  // Utility to read file content as text (supports TXT, DOCX, PDF)
  const readFileAsText = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase();
    const isTxt = fileName.endsWith('.txt');
    const isDocx = fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';

    let content: string;
    
    // Handling Plain Text (.txt)
    if (isTxt) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          content = event.target?.result as string;
          resolve(content.substring(0, 50000)); 
        };
        reader.onerror = (error) => {
          reject(new Error(`Failed to read TXT file: ${file.name}`));
        };
        reader.readAsText(file);
      });
    }
    
    // Handling Binary Files (.docx, .pdf)
    try {
      if (isDocx) {
        content = await parseDocx(file);
      } else if (isPdf) {
        content = await parsePdf(file);
      } else {
        throw new Error(`Unsupported file type: ${file.name}. Only .txt, .docx, and .pdf are supported.`);
      }

      // Apply truncation and resolve for DOCX/PDF
      return content.substring(0, 50000);
      
    } catch (error) {
      throw error; 
    }
  };

  // --- API Utility with Exponential Backoff ---
  const fetchApiWithBackoff = async (apiUrl: string, payload: any, maxRetries = 3) => {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`API call failed with status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        attempt++;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; 
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new Error("Failed to communicate with Gemini API after multiple retries.");
        }
      }
    }
  };

  // --- Function to generate the STUDY AID content ---
  const generateContentWithGemini = async (content: string, style: string): Promise<{ text: string; sources: any[] }> => {
    let systemPrompt = "";
    let userQuery = `Based on the following study material, create a personalized study aid for a ${style} learner. The content should focus on key concepts and actionable learning points.`;

    // Adaptive Prompting Logic for Study Aid
    if (style === "visual") {
      systemPrompt = "You are an expert tutor creating a structured study guide for a visual learner. Your output MUST be formatted using markdown to emphasize visual structure: use bullet points, numbered lists, tables, and clear headings. For every main concept, suggest a simple visual representation (like a flowchart, diagram, or mind-map structure) that the learner can draw.";
    } else if (style === "practical") {
      systemPrompt = "You are an expert tutor creating a practical study guide focused on application for a hands-on learner. Your output MUST include at least three detailed, real-world examples or case studies that demonstrate how the core concepts are used in practice. Also, include a short practice scenario or question.";
    } else if (style === "conceptual") {
      systemPrompt = "You are an expert tutor creating a conceptual study guide for a learner who thrives on understanding deep theories. Your output MUST clearly define the underlying principles and explain the relationships between the main ideas, using strong analogies if possible. Explain the 'Why' behind the facts.";
    }

    userQuery += "\n\nMaterial to study:\n" + content;

    const apiKey = "";
    const model = "gemini-2.5-flash-preview-05-20";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const result = await fetchApiWithBackoff(apiUrl, payload);
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
        throw new Error("Invalid response structure for study aid from Gemini API.");
    }
  };


  // --- Function to generate the QUIZ content (Structured JSON, requesting 5 questions) ---
  const generateQuizWithGemini = async (context: string): Promise<QuizQuestion[]> => {
    const systemPrompt = `You are a quiz master. Your task is to generate five unique multiple-choice questions (4 options each) based on the provided text context. 
    For each question, you MUST provide explanations for the correct answer tailored to three specific learning styles: visual, practical, and conceptual. 
    The output MUST be a valid JSON array matching the provided schema. Each question must be challenging but directly answerable from the context.`;

    const userQuery = `Generate 5 quiz questions and the required explanations based on this material: \n\n${context}`;

    // JSON Schema for structured output (Now an ARRAY of QuizQuestion objects)
    const responseSchema = {
        type: "ARRAY",
        items: {
            type: "OBJECT",
            properties: {
                "question": { "type": "STRING" },
                "options": { 
                    "type": "ARRAY",
                    "items": { "type": "STRING" },
                    "description": "Exactly four multiple-choice options."
                },
                "correctAnswerIndex": { 
                    "type": "INTEGER", 
                    "description": "The 0-based index of the correct option (0, 1, 2, or 3)." 
                },
                "explanation_visual": { "type": "STRING" },
                "explanation_practical": { "type": "STRING" },
                "explanation_conceptual": { "type": "STRING" }
            },
            "required": ["question", "options", "correctAnswerIndex", "explanation_visual", "explanation_practical", "explanation_conceptual"],
            "propertyOrdering": ["question", "options", "correctAnswerIndex", "explanation_visual", "explanation_practical", "explanation_conceptual"]
        }
    };

    const apiKey = ""; 
    const model = "gemini-2.5-flash-preview-05-20";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    };
    
    const result = await fetchApiWithBackoff(apiUrl, payload);

    try {
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) throw new Error("JSON response text is empty.");
        const parsedJson = JSON.parse(jsonText);
        
        // Basic validation: Check if it's an array and has at least one question
        if (!Array.isArray(parsedJson) || parsedJson.length === 0) {
            throw new Error("Parsed quiz structure is invalid: Expected an array of questions.");
        }

        return parsedJson as QuizQuestion[];
    } catch (e) {
        console.error("Failed to parse quiz JSON:", e);
        throw new Error("Could not parse valid quiz data from AI response.");
    }
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
    setQuizQuestions(null); // Clear previous quiz
    setQuizScore(0);
    setCurrentQuestionIndex(0);
    setQuizStatus('unanswered');
    setIncorrectCount(0);

    const file = selectedFiles[0]; // Process only the first file for MVP

    toast({
      title: "Creating study aid...",
      description: `1. Reading file: ${file.name}`,
    });

    try {
      // 1. Read file content 
      const fileContent = await readFileAsText(file);
      
      toast({
        title: "Creating study aid...",
        description: `2. Generating personalized content for ${currentStyle.title}...`,
      });

      // 2. Call AI Generation for Study Aid
      const result = await generateContentWithGemini(fileContent, currentLearningStyle);

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
        description: "Your personalized study aid is ready. Scroll down to take the quiz!",
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Generation Failed",
        description: (error as Error).message || "An unexpected error occurred during AI processing.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- QUIZ LOGIC FUNCTIONS ---
  
  const fetchNewQuizQuestionSet = async () => {
    if (!generatedOutput?.text) {
        toast({ title: "Error", description: "Please generate a study aid first to create a quiz.", variant: "destructive" });
        return;
    }

    setIsGeneratingQuiz(true);
    setQuizQuestions(null);
    setCurrentQuestionIndex(0);
    setQuizStatus('unanswered');
    setIncorrectCount(0);
    setQuizScore(0);

    try {
        toast({ title: "Generating Quiz Set...", description: "AI is crafting 5 new questions..." });
        const newQuizSet = await generateQuizWithGemini(generatedOutput.text);
        setQuizQuestions(newQuizSet);
        toast({ title: "Quiz Ready!", description: "Start the 5-question personalized quiz." });
    } catch (error) {
        console.error("Quiz generation error:", error);
        toast({ title: "Quiz Failed", description: "Could not generate quiz data. " + (error as Error).message, variant: "destructive" });
    } finally {
        setIsGeneratingQuiz(false);
  }
  };
  
  // Renders the correct explanation based on the quiz status and the current learning style
  const getExplanationText = useMemo(() => {
    if (!currentQuiz || quizStatus !== 'incorrect') return null;

    let styleToExplain = currentLearningStyle;

    // Adaptive switch logic: If 3 consecutive incorrect answers, switch style for explanation.
    if (incorrectCount >= 3) {
        styleToExplain = getNextStyle(currentLearningStyle, learningStylesArray);
    }

    const explanationKey = learningStyleInfo[styleToExplain as keyof typeof learningStyleInfo].explanationKey;
    const explanation = currentQuiz[explanationKey];
    const explanationStyle = learningStyleInfo[styleToExplain as keyof typeof learningStyleInfo].title;

    return { explanation, explanationStyle, newStyle: styleToExplain };
  }, [currentQuiz, quizStatus, incorrectCount, currentLearningStyle]);


  // Function to handle user clicking an answer option
  const handleAnswerSubmit = (selectedIndex: number) => {
    if (quizStatus !== 'unanswered' || isGeneratingQuiz || !currentQuiz) return;

    setUserSelection(selectedIndex);

    if (selectedIndex === currentQuiz.correctAnswerIndex) {
        setQuizStatus('correct');
        setIncorrectCount(0); // Reset incorrect count on success
        setQuizScore(prev => prev + 1); // Increment score
        // NEW: Increase confidence by 1% on correct answer (max 100)
        setProfileConfidence(prev => Math.min(100, prev + 1)); 
        toast({ title: "Correct!", description: "Great job! Click Next Question to continue." });
    } else {
        setQuizStatus('incorrect');
        setIncorrectCount(prev => prev + 1);
        toast({ title: "Incorrect.", description: "Review the explanation below.", variant: "destructive" });
    }
  };

  // Function to handle moving to the next question, including style switching logic
  const handleNextQuestion = async () => {
    if (!currentQuiz || !quizQuestions) return;
    
    // 1. Check for end of quiz
    if (currentQuestionIndex >= quizQuestions.length - 1) {
        setQuizStatus('completed');
        return; // Quiz finished
    }

    // 2. Check if we need to switch style due to persistent mistakes
    if (quizStatus === 'incorrect' && incorrectCount >= 3) {
        const nextStyle = getNextStyle(currentLearningStyle, learningStylesArray);
        
        // Update localStorage and component state to the new, potentially more effective style
        localStorage.setItem("learningStyle", nextStyle);
        setCurrentLearningStyle(nextStyle);
        
        // NEW: Decrease confidence by 25% on style switch (min 0)
        setProfileConfidence(prev => Math.max(0, prev - 25));
        
        toast({ 
            title: "Adaptive Change!", 
            description: `The quiz detected difficulty. Switching your profile to the ${learningStyleInfo[nextStyle as keyof typeof learningStyleInfo].title} profile for better comprehension. (Confidence -25%)`,
            variant: "default"
        });
        
        setIncorrectCount(0); // Reset incorrect count after switching
    }

    // 3. Move to the next question
    setCurrentQuestionIndex(prev => prev + 1);
    setQuizStatus('unanswered');
    setUserSelection(null);
  };

  const handleRetakeQuiz = () => {
    setQuizScore(0);
    setCurrentQuestionIndex(0);
    setQuizStatus('unanswered');
    setIncorrectCount(0);
    setUserSelection(null);
  };
  
  // --- END QUIZ LOGIC FUNCTIONS ---


  // Placeholder function for the MVP feedback loop
  const handleFeedback = (isHelpful: boolean) => {
    console.log(`Feedback received: ${isHelpful ? 'Helpful' : 'Not Helpful'} for style: ${currentLearningStyle}`);
    toast({
        title: "Feedback Recorded",
        description: `Thank you! This helps us refine content for ${currentLearningStyle} learners.`,
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
                    {/* UPDATED: Use dynamic profileConfidence state */}
                    <span className="font-medium">{profileConfidence}%</span> 
                  </div>
                  {/* UPDATED: Use dynamic profileConfidence state */}
                  <Progress value={profileConfidence} className="h-2" /> 
                </div>
                <p className="text-sm text-muted-foreground">
                  As you use LearnMate, we'll continue refining your learning profile based on
                  what works best for you. Confidence decreases when the style needs adjustment and increases with correct answers!
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

        {/* Study Aid Output Section */}
        {(isLoading || generatedOutput) && (
          <Card className="mt-8 shadow-card border-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-secondary" />
                    AI-Generated Study Aid
                </CardTitle>
                {generatedOutput && (
                  <div className={`px-3 py-1 text-sm font-medium rounded-full ${currentStyle.bg} ${currentStyle.color}`}>
                    For {currentStyle.title}
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
                  
                  {/* Action button to start the quiz */}
                  <div className="mt-6">
                    <Button 
                      onClick={fetchNewQuizQuestionSet} 
                      disabled={isGeneratingQuiz || quizQuestions !== null} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      size="lg"
                    >
                      {isGeneratingQuiz ? (
                        <RotateCw className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-5 h-5 mr-2" />
                      )}
                      {quizQuestions === null ? (
                          isGeneratingQuiz ? 'Generating 5 Questions...' : 'Start Personalized Quiz (5 Questions)'
                      ) : (
                          'Quiz Set Ready'
                      )}
                    </Button>
                  </div>

                  {/* Simple feedback loop MVP */}
                  <div className="mt-6 flex items-center justify-between p-4 bg-success/10 border border-success/30 rounded-lg">
                    <p className="font-medium text-sm text-success-foreground">Was this study aid helpful?</p>
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
        
        {/* --- QUIZ SECTION (NEW) --- */}
        {quizQuestions && (
          <Card className="mt-8 shadow-glow border-2 border-indigo-400">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2 text-indigo-700">
                <Zap className="w-6 h-6" />
                Personalized Quiz
              </CardTitle>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {quizQuestions.length}. Score: {quizScore}/{quizQuestions.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quizStatus !== 'completed' && currentQuiz ? (
                <>
                  {/* Quiz Question */}
                  <div className="mb-6 p-4 rounded-lg bg-indigo-50 border border-indigo-200">
                    <p className="text-lg font-semibold text-indigo-800 mb-3">
                      Q: {currentQuiz.question}
                    </p>
                  </div>

                  {/* Quiz Options - IMPROVED STYLING */}
                  <div className="space-y-3">
                    {currentQuiz.options.map((option, index) => {
                      
                      // Determine button style based on status
                      let buttonClass = "w-full justify-start transition-colors duration-150 text-left h-auto py-3 px-4";
                      let disabled = quizStatus !== 'unanswered';

                      if (quizStatus !== 'unanswered') {
                        // Answer is submitted/checked
                        if (index === currentQuiz.correctAnswerIndex) {
                          buttonClass += " bg-green-100 border-2 border-green-600 text-green-800 font-bold hover:bg-green-100";
                        } else if (index === userSelection) {
                          buttonClass += " bg-red-100 border-2 border-red-600 text-red-800 font-bold hover:bg-red-100";
                        } else {
                          buttonClass += " bg-gray-100 text-gray-500 border border-gray-200";
                        }
                      } else {
                        // Answer is unanswered
                        buttonClass += " bg-white hover:bg-indigo-50 border border-indigo-200";
                        if (index === userSelection) {
                             buttonClass += " border-2 border-indigo-500 ring-4 ring-indigo-200";
                        }
                      }
                      
                      return (
                        <Button
                          key={index}
                          variant="outline"
                          // Added flex-col and flex-1 for responsive wrapping and alignment
                          className={`${buttonClass} flex flex-col items-start`}
                          onClick={() => handleAnswerSubmit(index)}
                          disabled={disabled}
                        >
                          <span className="font-mono text-sm mr-3">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <span className="flex-1 whitespace-normal text-wrap">
                            {option}
                          </span>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Status & Explanation */}
                  {quizStatus !== 'unanswered' && (
                    <div className="mt-6 p-4 rounded-lg border-2" 
                        style={{ 
                            borderColor: quizStatus === 'correct' ? '#10B981' : '#F59E0B', 
                            backgroundColor: quizStatus === 'correct' ? '#ECFDF5' : '#FFFBEB' 
                        }}>
                        
                        <div className="flex items-center mb-3">
                          {quizStatus === 'correct' ? (
                            <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-6 h-6 text-yellow-600 mr-2" />
                          )}
                          <p className={`font-bold ${quizStatus === 'correct' ? 'text-green-600' : 'text-yellow-700'}`}>
                            {quizStatus === 'correct' ? 'Correct!' : 'Incorrect.'}
                            {quizStatus === 'incorrect' && incorrectCount < 3 && (
                              <span className="ml-2 font-normal text-sm text-gray-600">
                                (Mistake {incorrectCount} of 3 in a row)
                              </span>
                            )}
                            {quizStatus === 'incorrect' && incorrectCount >= 3 && (
                              <span className="ml-2 font-normal text-sm text-red-600">
                                (Adaptive Learning: Explanation switching to {getExplanationText?.explanationStyle})
                              </span>
                            )}
                          </p>
                        </div>

                        {quizStatus === 'incorrect' && getExplanationText && (
                            <div className="mt-4 p-3 bg-white border rounded-md">
                                <p className="font-semibold text-sm mb-2 text-gray-700">
                                    Explanation ({getExplanationText.explanationStyle}):
                                </p>
                                <p className="text-sm whitespace-pre-wrap">
                                    {getExplanationText.explanation}
                                </p>
                            </div>
                        )}
                        
                        {/* Next Button */}
                        <div className="mt-4">
                            <Button 
                                onClick={handleNextQuestion} 
                                disabled={isGeneratingQuiz}
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                            >
                                {isGeneratingQuiz ? (
                                    <RotateCw className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <>
                                        {currentQuestionIndex < quizQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                        <ChevronRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                  )}
                  {incorrectCount > 0 && quizStatus === 'unanswered' && (
                    <div className="px-6 pb-4 text-xs text-center text-red-500">
                        You have {incorrectCount} consecutive incorrect answers. Get 3 in a row to switch learning styles.
                    </div>
                  )}
                </>
              ) : (
                // Quiz Completed State
                <div className="text-center p-10 space-y-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <Trophy className="w-12 h-12 text-yellow-500 mx-auto" />
                    <h3 className="text-2xl font-bold text-indigo-700">Quiz Completed!</h3>
                    <p className="text-xl">
                        Your Final Score: <span className="font-extrabold text-green-600">{quizScore}/{quizQuestions.length}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Your final profile confidence is <span className="font-bold text-primary">{profileConfidence}%</span>. Keep practicing or upload new material to continue your adaptive learning journey.
                    </p>
                    <div className="flex justify-center gap-4 pt-2">
                        <Button onClick={handleRetakeQuiz} variant="secondary">Retake Quiz</Button>
                        <Button onClick={fetchNewQuizQuestionSet}>Generate New Quiz</Button>
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
