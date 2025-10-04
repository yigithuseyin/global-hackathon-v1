import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Upload, FileText, Eye, Target, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const learningStyle = localStorage.getItem("learningStyle") || "visual";
  const [uploadedFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

  const handleCreateStudyAid = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files first",
        variant: "destructive",
      });
      return;
    }

    // TODO: This needs Lovable Cloud for storage and AI processing
    toast({
      title: "Creating study aid...",
      description: `Processing ${selectedFiles.length} file(s) for ${currentStyle.title}`,
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
                  <p className="text-2xl font-bold">0</p>
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
              accept=".pdf,.txt,.docx,.pptx"
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
                Supports PDF, TXT, DOCX, and slide formats
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
              disabled={selectedFiles.length === 0}
              className="w-full mt-4"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Create Study Aid
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
                        <CardDescription>Uploaded recently</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full">
                      View Generated Content
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
