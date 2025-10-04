import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Brain, Eye, Lightbulb, Target, BookOpen, Zap } from "lucide-react";

const questions = [
  {
    id: 1,
    question: "When learning new material, what helps you most?",
    options: [
      { value: "visual", label: "Diagrams, charts, and visual representations", icon: Eye },
      { value: "practical", label: "Real-world examples and hands-on practice", icon: Target },
      { value: "conceptual", label: "Understanding theories and underlying principles", icon: Lightbulb },
    ],
  },
  {
    id: 2,
    question: "How do you prefer to study?",
    options: [
      { value: "visual", label: "Creating mind maps and color-coded notes", icon: Eye },
      { value: "practical", label: "Working through practice problems and case studies", icon: Target },
      { value: "conceptual", label: "Reading in-depth and making theoretical connections", icon: Lightbulb },
    ],
  },
  {
    id: 3,
    question: "What frustrates you most about current study materials?",
    options: [
      { value: "visual", label: "Too much text, not enough visual aids", icon: Eye },
      { value: "practical", label: "Too abstract, lacking practical applications", icon: Target },
      { value: "conceptual", label: "Too surface-level, missing deeper explanations", icon: Lightbulb },
    ],
  },
  {
    id: 4,
    question: "When you remember something well, it's usually because:",
    options: [
      { value: "visual", label: "I can picture it in my mind", icon: Eye },
      { value: "practical", label: "I applied it to something real", icon: Target },
      { value: "conceptual", label: "I understood why it works", icon: Lightbulb },
    ],
  },
  {
    id: 5,
    question: "Your ideal study resource would include:",
    options: [
      { value: "visual", label: "Infographics, flowcharts, and visual summaries", icon: Eye },
      { value: "practical", label: "Step-by-step examples and practical exercises", icon: Target },
      { value: "conceptual", label: "Detailed explanations and theoretical frameworks", icon: Lightbulb },
    ],
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion]: value });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate learning style
      const counts = { visual: 0, practical: 0, conceptual: 0 };
      Object.values(answers).forEach((answer) => {
        counts[answer as keyof typeof counts]++;
      });
      const learningStyle = Object.entries(counts).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
      
      // Store in localStorage for now (will use database later)
      localStorage.setItem("learningStyle", learningStyle);
      navigate("/dashboard");
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const currentQ = questions[currentQuestion];
  const canProceed = answers[currentQuestion] !== undefined;

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Brain className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LearnMate AI
            </h1>
          </div>
          <p className="text-muted-foreground">
            Let's personalize your learning experience
          </p>
        </div>

        <Card className="shadow-glow border-2">
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <div>
                <CardTitle className="text-2xl mb-2">{currentQ.question}</CardTitle>
                <CardDescription>
                  Question {currentQuestion + 1} of {questions.length}
                </CardDescription>
              </div>
              <div className="bg-gradient-primary rounded-full p-3">
                {currentQuestion === 0 && <BookOpen className="w-6 h-6 text-primary-foreground" />}
                {currentQuestion === 1 && <Brain className="w-6 h-6 text-primary-foreground" />}
                {currentQuestion === 2 && <Zap className="w-6 h-6 text-primary-foreground" />}
                {currentQuestion === 3 && <Lightbulb className="w-6 h-6 text-primary-foreground" />}
                {currentQuestion === 4 && <Target className="w-6 h-6 text-primary-foreground" />}
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={answers[currentQuestion] || ""}
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              {currentQ.options.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.value}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-smooth cursor-pointer ${
                      answers[currentQuestion] === option.value
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                    onClick={() => handleAnswer(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                    <Label
                      htmlFor={option.value}
                      className="flex-1 cursor-pointer text-base"
                    >
                      {option.label}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentQuestion === 0}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex-1"
                size="lg"
              >
                {currentQuestion === questions.length - 1 ? "Complete" : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
