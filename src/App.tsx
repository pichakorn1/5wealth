import React, { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Check, Table as TableIcon, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// --- STYLE CONSTANTS ---
const mono = { fontFamily: "'DM Mono', monospace" };
const serif = { fontFamily: "'DM Serif Display', Georgia, serif" };
const LI = "border-b border-stone-200 bg-transparent text-xs py-0.5 focus:outline-none focus:border-stone-500 w-full placeholder:text-stone-300 transition-colors";
const MI = "border-b border-stone-200 bg-transparent text-xs py-0.5 focus:outline-none focus:border-stone-500 text-right placeholder:text-stone-300 transition-colors";

// --- HELPER COMPONENTS ---
const SLabel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`font-black uppercase tracking-wider text-stone-800 mb-1.5 text-[10px] ${className}`}>
    {children}
  </h3>
);

const Divider = () => <hr className="border-stone-200 my-2.5" />;

const MiniLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-stone-400 text-[8px] uppercase tracking-tighter" style={mono}>
    {children}
  </span>
);

// --- TYPES ---
type Task = { text: string; done: boolean };
type Meal = { label: string; menu: string; kcal: number; prot: number; carb: number; fat: number };
type Exercise = { id: string; name: string; kcal: number };
type FinRow = { id: string; desc: string; type: 'INC' | 'EXP'; amount: number };

// --- PILLAR DEFINITIONS ---
const PILLARS = [
  { name: 'Physical', icon: '💪', color: 'stone-900' },
  { name: 'Mental', icon: '🧠', color: 'stone-700' },
  { name: 'Financial', icon: '💰', color: 'stone-800' },
  { name: 'Social', icon: '🤝', color: 'stone-600' },
  { name: 'Growth', icon: '🌱', color: 'stone-500' },
];

export default function App() {
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date().getDay()]);
  const [moodAm, setMoodAm] = useState(-1);
  const [moodPm, setMoodPm] = useState(-1);
  const [morningThought, setMorningThought] = useState("");
  const [morningIntention, setMorningIntention] = useState("");

  const [tasks, setTasks] = useState({
    must: Array(4).fill(null).map(() => ({ text: "", done: false })),
    should: Array(4).fill(null).map(() => ({ text: "", done: false }))
  });

  const [meals, setMeals] = useState<Meal[]>([
    { label: "Meal 1", menu: "", kcal: 0, prot: 0, carb: 0, fat: 0 },
    { label: "Meal 2", menu: "", kcal: 0, prot: 0, carb: 0, fat: 0 },
    { label: "Meal before bed", menu: "", kcal: 0, prot: 0, carb: 0, fat: 0 },
    { label: "Snack / Other", menu: "", kcal: 0, prot: 0, carb: 0, fat: 0 }
  ]);

  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: "", kcal: 0 },
    { id: '2', name: "", kcal: 0 },
    { id: '3', name: "", kcal: 0 }
  ]);

  const [wellness, setWellness] = useState({
    read: 0, meditate: 0, water: 0, sleep: 0, steps: 0, focus: 0
  });

  const [social, setSocial] = useState(["", "", ""]);

  const [finRows, setFinRows] = useState<FinRow[]>([
    { id: 'e1', desc: "Food", type: 'EXP', amount: 0 },
    { id: 'e2', desc: "Transport", type: 'EXP', amount: 0 },
    { id: 'e3', desc: "Lifestyle", type: 'EXP', amount: 0 },
    { id: 'e4', desc: "Other", type: 'EXP', amount: 0 },
    { id: 'i1', desc: "Salary/Transfer", type: 'INC', amount: 0 },
    { id: 'i2', desc: "Extra income", type: 'INC', amount: 0 }
  ]);

  const [reflection, setReflection] = useState({
    best: "", improve: "", proud: "", tomorrow1: "", tomorrow2: ""
  });

  const dateInputRef = useRef<HTMLInputElement>(null);
  const plannerRef = useRef<HTMLDivElement>(null);

  // --- CALCULATIONS ---
  const nutritionTotals = useMemo(() => {
    return meals.reduce((acc, m) => ({
      kcal: acc.kcal + (Number(m.kcal) || 0),
      prot: acc.prot + (Number(m.prot) || 0),
      carb: acc.carb + (Number(m.carb) || 0),
      fat: acc.fat + (Number(m.fat) || 0)
    }), { kcal: 0, prot: 0, carb: 0, fat: 0 });
  }, [meals]);

  const totalExKcal = useMemo(() => {
    return exercises.reduce((sum, ex) => sum + (Number(ex.kcal) || 0), 0);
  }, [exercises]);

  const financeTotals = useMemo(() => {
    const exp = finRows.filter(r => r.type === 'EXP').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const inc = finRows.filter(r => r.type === 'INC').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    return { exp, inc, net: inc - exp };
  }, [finRows]);

  const pillarProgress = useMemo(() => {
    // Calculate progress for each pillar based on daily actions
    const physical = Math.min(100, (nutritionTotals.kcal > 0 ? 25 : 0) + (totalExKcal > 0 ? 25 : 0) + (wellness.steps > 0 ? 25 : 0) + (wellness.water > 0 ? 25 : 0));
    const mental = Math.min(100, (wellness.meditate > 0 ? 50 : 0) + (wellness.sleep >= 7 ? 50 : 0));
    const financial = Math.min(100, (financeTotals.inc > 0 ? 50 : 0) + (financeTotals.net >= 0 ? 50 : 0));
    const socialP = Math.min(100, social.filter(s => s.trim() !== "").length * 33.3);
    const growth = Math.min(100, (wellness.read > 0 ? 50 : 0) + (tasks.must.filter(t => t.done).length * 12.5));
    
    return [physical, mental, financial, socialP, growth];
  }, [nutritionTotals, totalExKcal, wellness, financeTotals, social, tasks]);

  // --- HANDLERS ---
  const shiftDate = (days: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + days);
    setCurrentDate(next);
    setSelectedDay(['S', 'M', 'T', 'W', 'T', 'F', 'S'][next.getDay()]);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const [y, m, d] = val.split('-').map(Number);
      const next = new Date(y, m - 1, d);
      setCurrentDate(next);
      setSelectedDay(['S', 'M', 'T', 'W', 'T', 'F', 'S'][next.getDay()]);
      setShowDatePicker(false);
    }
  };

  const toggleTask = (type: 'must' | 'should', index: number) => {
    const newTasks = { ...tasks };
    newTasks[type][index].done = !newTasks[type][index].done;
    setTasks(newTasks);
  };

  const updateTaskText = (type: 'must' | 'should', index: number, text: string) => {
    const newTasks = { ...tasks };
    newTasks[type][index].text = text;
    setTasks(newTasks);
  };

  const updateMeal = (index: number, field: keyof Meal, value: string | number) => {
    const newMeals = [...meals];
    newMeals[index] = { ...newMeals[index], [field]: value };
    setMeals(newMeals);
  };

  const addExercise = () => {
    setExercises([...exercises, { id: Date.now().toString(), name: "", kcal: 0 }]);
  };

  const deleteExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string | number) => {
    const newEx = [...exercises];
    newEx[index] = { ...newEx[index], [field]: value };
    setExercises(newEx);
  };

  const addFinRow = (type: 'INC' | 'EXP') => {
    setFinRows([...finRows, { id: Date.now().toString(), desc: "", type, amount: 0 }]);
  };

  const updateFinRow = (index: number, field: keyof FinRow, value: string | number) => {
    const newFin = [...finRows];
    newFin[index] = { ...newFin[index], [field]: value };
    setFinRows(newFin);
  };

  const deleteFinRow = (id: string) => {
    setFinRows(finRows.filter(r => r.id !== id));
  };

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const moods = ['😣', '😔', '😐', '🙂', '😄'];

  // --- EXPORT FUNCTIONS ---
  const exportToPDF = async () => {
    if (!plannerRef.current) return;
    try {
      const canvas = await html2canvas(plannerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`5-Wealth-Planner-${formatDate(currentDate)}.pdf`);
    } catch (error) {
      console.error('PDF Export failed:', error);
    }
  };

  const exportToSheet = () => {
    const data = [
      ["5 WEALTH PLANNER", "", ""],
      ["Date", formatDate(currentDate), ""],
      ["", "", ""],
      ["TIME WEALTH (TODAY TASK)", "", ""],
      ["Status", "Task Type", "Description"],
      ...tasks.must.map(t => [t.done ? "Done" : "Pending", "Must Do", t.text || ""]),
      ...tasks.should.map(t => [t.done ? "Done" : "Pending", "Should/Could Do", t.text || ""]),
      ["", "", ""],
      ["PHYSICAL WEALTH - NUTRITION", "", ""],
      ["Meal", "Menu", "Kcal", "Prot (g)", "Carb (g)", "Fat (g)"],
      ...meals.map(m => [m.label, m.menu || "", m.kcal, m.prot, m.carb, m.fat]),
      ["TOTAL", "", nutritionTotals.kcal, nutritionTotals.prot, nutritionTotals.carb, nutritionTotals.fat],
      ["", "", ""],
      ["PHYSICAL WEALTH - EXERCISE", "", ""],
      ["Activity", "Kcal Burned", ""],
      ...exercises.map(ex => [ex.name || "", ex.kcal, ""]),
      ["TOTAL BURNED", totalExKcal, ""],
      ["", "", ""],
      ["FINANCIAL WEALTH", "", ""],
      ["Type", "Description", "Amount (฿)"],
      ...finRows.map(r => [r.type === 'INC' ? "Income" : "Expense", r.desc || "", r.amount]),
      ["TOTAL INCOME", "", financeTotals.inc],
      ["TOTAL EXPENSE", "", financeTotals.exp],
      ["NET BALANCE", "", financeTotals.net],
      ["", "", ""],
      ["SOCIAL WEALTH", "", ""],
      ["Contact List", "", ""],
      ...social.map(s => [s || "", "", ""]),
      ["", "", ""],
      ["MENTAL WEALTH", "", ""],
      ["Category", "Detail", ""],
      ["Morning Focus", morningIntention || "", ""],
      ["Best thing today", reflection.best || "", ""],
      ["Proud of", reflection.proud || "", ""],
      ["Improvement", reflection.improve || "", ""],
      ["Tomorrow Priority 1", reflection.tomorrow1 || "", ""],
      ["Tomorrow Priority 2", reflection.tomorrow2 || "", ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Planner");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `5-Wealth-Planner-${formatDate(currentDate)}.xlsx`);
  };

  return (
    <div className="min-h-screen py-10 px-4">
      <div ref={plannerRef} className="max-w-4xl mx-auto bg-white shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* 1. HEADER BAR */}
        <header className="border-b-2 border-stone-900 px-5 py-4 flex justify-between items-center">
          <div className="w-24"></div>
          <div className="text-center">
            <h1 className="font-black uppercase tracking-[0.2em] text-[17px] leading-tight">5 Wealth Planner</h1>
            <p className="text-stone-400 text-[8px] mt-1" style={mono}>
              A SYSTEM TO TRACK AND ORGANISE EVERY DIMENSION OF LIFE · 5 WEALTH PILLARS
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDate(-1)} className="p-1 hover:bg-stone-100 rounded transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowDatePicker(true)}
                className="text-[11px] font-medium hover:text-stone-500 transition-colors"
                style={mono}
              >
                {formatDate(currentDate)}
              </button>
              {showDatePicker && (
                <input 
                  type="date"
                  ref={dateInputRef}
                  autoFocus
                  className="absolute top-0 left-0 opacity-0 w-full h-full cursor-pointer"
                  onChange={handleDateChange}
                  onBlur={() => setTimeout(() => setShowDatePicker(false), 150)}
                />
              )}
            </div>
            <button onClick={() => shiftDate(1)} className="p-1 hover:bg-stone-100 rounded transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </header>

        {/* 2. PILLAR PROGRESS & MORNING CHECK-IN */}
        <section className="border-b border-stone-200 grid grid-cols-[1.2fr_1fr] gap-6 px-5 py-4">
          <div>
            <SLabel className="mb-3">Wealth Pillars Status</SLabel>
            <div className="grid grid-cols-5 gap-2">
              {PILLARS.map((pillar, i) => (
                <div key={pillar.name} className="flex flex-col items-center gap-1">
                  <div className="relative w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-stone-900 transition-all duration-500"
                      style={{ width: `${pillarProgress[i]}%` }}
                    />
                  </div>
                  <span className="text-[7px] uppercase font-bold tracking-tighter" style={mono}>{pillar.name}</span>
                  <span className="text-[10px]">{pillar.icon}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 border-l border-stone-100 pl-6">
            <div className="flex items-center justify-between">
              <SLabel className="mb-0">Mental Wealth (Morning Check-in)</SLabel>
              <div className="flex gap-1.5">
                {moods.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => setMoodAm(i)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all border ${
                      moodAm === i ? 'bg-stone-900 border-stone-900' : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-stone-400 whitespace-nowrap">Focus:</span>
                <input 
                  type="text" 
                  className={LI} 
                  value={morningIntention}
                  onChange={(e) => setMorningIntention(e.target.value)}
                  placeholder="Main intention today..."
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2.5 DAY SELECTOR */}
        <section className="border-b border-stone-200 px-5 py-2 flex items-center justify-between bg-[#fdfdfc]">
          <div className="flex items-center gap-3">
            <MiniLabel>Active Day:</MiniLabel>
            <div className="flex gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={`w-5 h-5 rounded text-[9px] flex items-center justify-center transition-all border ${
                    selectedDay === day ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 hover:border-stone-400'
                  }`}
                  style={mono}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MiniLabel>Net Energy:</MiniLabel>
              <span className="text-[10px] font-bold" style={mono}>
                {nutritionTotals.kcal - totalExKcal > 0 ? '+' : ''}{nutritionTotals.kcal - totalExKcal} kcal
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MiniLabel>Net Cash:</MiniLabel>
              <span className={`text-[10px] font-bold ${financeTotals.net >= 0 ? 'text-stone-900' : 'text-stone-400'}`} style={mono}>
                ฿{financeTotals.net.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* 3. TIME WEALTH */}
        <section className="border-b-2 border-stone-900 px-5 py-4">
          <div className="flex items-baseline gap-3 mb-3">
            <h2 className="font-black uppercase tracking-widest text-xs">Time Wealth (Today Task)</h2>
            <div className="flex-1 h-[1px] bg-stone-200"></div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <SLabel className="text-stone-400 italic font-medium normal-case mb-2">MUST DO: (most critical work)</SLabel>
              <div className="space-y-2">
                {tasks.must.map((task, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleTask('must', i)}
                      className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-colors ${
                        task.done ? 'bg-stone-900 border-stone-900' : 'border-stone-300'
                      }`}
                    >
                      {task.done && <Check size={10} className="text-white" />}
                    </button>
                    <input 
                      type="text" 
                      className={`${LI} ${task.done ? 'line-through text-stone-300' : ''}`}
                      value={task.text}
                      onChange={(e) => updateTaskText('must', i, e.target.value)}
                      placeholder="Enter task..."
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SLabel className="text-stone-400 italic font-medium normal-case mb-2">SHOULD DO / COULD DO / QUICK WINS:</SLabel>
              <div className="space-y-2">
                {tasks.should.map((task, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleTask('should', i)}
                      className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-colors ${
                        task.done ? 'bg-stone-900 border-stone-900' : 'border-stone-300'
                      }`}
                    >
                      {task.done && <Check size={10} className="text-white" />}
                    </button>
                    <input 
                      type="text" 
                      className={`${LI} ${task.done ? 'line-through text-stone-300' : ''}`}
                      value={task.text}
                      onChange={(e) => updateTaskText('should', i, e.target.value)}
                      placeholder="Enter task..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. MAIN BODY */}
        <div className="grid grid-cols-2 border-b border-stone-200">
          
          {/* LEFT COLUMN: Physical Wealth */}
          <div className="border-r border-stone-200 p-5">
            <h2 className="text-sm mb-4" style={serif}><i>Physical Wealth</i></h2>
            
            {/* A. NUTRITION */}
            <div className="mb-6">
              <SLabel>Nutrition</SLabel>
              <div className="space-y-3">
                {meals.map((meal, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-stone-500 w-20 shrink-0">{meal.label}:</span>
                      <input 
                        type="text" 
                        className={LI} 
                        value={meal.menu}
                        onChange={(e) => updateMeal(i, 'menu', e.target.value)}
                        placeholder="Food name"
                      />
                      <MiniLabel>(menu)</MiniLabel>
                    </div>
                    <div className="pl-20 flex gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-stone-400" style={mono}>Cal:</span>
                        <input 
                          type="number" 
                          className={`${MI} w-10`} 
                          value={meal.kcal || ''}
                          onChange={(e) => updateMeal(i, 'kcal', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-stone-400" style={mono}>P:</span>
                        <input 
                          type="number" 
                          className={`${MI} w-8`} 
                          value={meal.prot || ''}
                          onChange={(e) => updateMeal(i, 'prot', e.target.value)}
                        />
                        <span className="text-[8px] text-stone-400" style={mono}>g</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-stone-400" style={mono}>C:</span>
                        <input 
                          type="number" 
                          className={`${MI} w-8`} 
                          value={meal.carb || ''}
                          onChange={(e) => updateMeal(i, 'carb', e.target.value)}
                        />
                        <span className="text-[8px] text-stone-400" style={mono}>g</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-stone-400" style={mono}>F:</span>
                        <input 
                          type="number" 
                          className={`${MI} w-8`} 
                          value={meal.fat || ''}
                          onChange={(e) => updateMeal(i, 'fat', e.target.value)}
                        />
                        <span className="text-[8px] text-stone-400" style={mono}>g</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-stone-50 rounded px-2 py-1.5 flex justify-between items-center" style={mono}>
                <span className="text-[9px] font-bold">Total Cal: {nutritionTotals.kcal}</span>
                <div className="flex gap-3 text-[8px] text-stone-500">
                  <span>P: {nutritionTotals.prot}g</span>
                  <span>C: {nutritionTotals.carb}g</span>
                  <span>F: {nutritionTotals.fat}g</span>
                </div>
              </div>
            </div>

            <Divider />

            {/* B. EXERCISE & MOVEMENT */}
            <div className="mb-6">
              <SLabel>Exercise & Movement</SLabel>
              <div className="grid grid-cols-[1fr_70px_14px] gap-2 mb-1">
                <span className="text-[8px] text-stone-400 uppercase" style={mono}>Activity</span>
                <span className="text-[8px] text-stone-400 uppercase text-right" style={mono}>Kcal</span>
                <span></span>
              </div>
              <div className="space-y-2">
                {exercises.map((ex, i) => (
                  <div key={ex.id} className="grid grid-cols-[1fr_70px_14px] gap-2 items-center">
                    <input 
                      type="text" 
                      className={LI} 
                      value={ex.name}
                      onChange={(e) => updateExercise(i, 'name', e.target.value)}
                      placeholder="Activity name"
                    />
                    <input 
                      type="number" 
                      className={MI} 
                      value={ex.kcal || ''}
                      onChange={(e) => updateExercise(i, 'kcal', e.target.value)}
                    />
                    <button onClick={() => deleteExercise(ex.id)} className="text-stone-300 hover:text-stone-900 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={addExercise}
                className="mt-2 text-[9px] text-stone-300 hover:text-stone-900 flex items-center gap-1 transition-colors"
                style={mono}
              >
                <Plus size={10} /> ADD EXERCISE
              </button>
              <div className="mt-3 bg-stone-50 rounded px-2 py-1.5 flex justify-between items-center" style={mono}>
                <span className="text-[9px] font-bold uppercase">Total Energy Burned</span>
                <span className="text-[9px] font-bold">{totalExKcal} kcal</span>
              </div>
            </div>

            <Divider />

            {/* C. DAILY WELLNESS */}
            <div className="mb-6">
              <SLabel>Daily Wellness</SLabel>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { label: "Read/Learn", key: "read", unit: "min" },
                  { label: "Meditation", key: "meditate", unit: "min" },
                  { label: "Water", key: "water", unit: "ml", sub: `≈${(wellness.water / 300).toFixed(1)} glasses` },
                  { label: "Sleep", key: "sleep", unit: "hrs" },
                  { label: "Steps", key: "steps", unit: "steps" },
                  { label: "Focus time", key: "focus", unit: "hrs" }
                ].map((item) => (
                  <div key={item.key} className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-stone-500">{item.label}:</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          className={`${MI} w-12`} 
                          value={(wellness as any)[item.key] || ''}
                          onChange={(e) => setWellness({ ...wellness, [item.key]: Number(e.target.value) })}
                        />
                        <span className="text-[8px] text-stone-400" style={mono}>{item.unit}</span>
                      </div>
                    </div>
                    {item.sub && <span className="text-[7px] text-stone-300 mt-0.5" style={mono}>{item.sub}</span>}
                  </div>
                ))}
              </div>
            </div>

            <Divider />

            {/* D. SOCIAL WEALTH */}
            <div>
              <SLabel>Social Wealth (People to Contact Today)</SLabel>
              <p className="text-[9px] text-stone-400 mb-2 italic">Today I need to contact / meet / follow up with:</p>
              <div className="space-y-2">
                {social.map((val, i) => (
                  <input 
                    key={i}
                    type="text" 
                    className={LI} 
                    value={val}
                    onChange={(e) => {
                      const newSocial = [...social];
                      newSocial[i] = e.target.value;
                      setSocial(newSocial);
                    }}
                    placeholder="Name — Phone / Line / Email..."
                  />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Financial Wealth */}
          <div className="p-5">
            <h2 className="text-sm mb-4" style={serif}><i>Financial Wealth</i></h2>
            
            {/* EXPENSES */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold">Expenses today:</span>
                <button 
                  onClick={() => addFinRow('EXP')}
                  className="text-[9px] text-stone-300 hover:text-stone-900 flex items-center gap-1 transition-colors"
                  style={mono}
                >
                  <Plus size={10} /> ADD
                </button>
              </div>
              <div className="space-y-2">
                {finRows.filter(r => r.type === 'EXP').map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_72px_14px] gap-2 items-center">
                    <input 
                      type="text" 
                      className={LI} 
                      value={row.desc}
                      onChange={(e) => {
                        const idx = finRows.findIndex(r => r.id === row.id);
                        updateFinRow(idx, 'desc', e.target.value);
                      }}
                      placeholder="Description"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-stone-400" style={mono}>฿</span>
                      <input 
                        type="number" 
                        className={MI} 
                        value={row.amount || ''}
                        onChange={(e) => {
                          const idx = finRows.findIndex(r => r.id === row.id);
                          updateFinRow(idx, 'amount', e.target.value);
                        }}
                      />
                    </div>
                    <button onClick={() => deleteFinRow(row.id)} className="text-stone-300 hover:text-stone-900 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-y border-stone-200 py-1.5 flex justify-between items-center" style={mono}>
                <span className="text-[10px] uppercase font-medium">Total Spent</span>
                <span className="text-[13px] font-bold">฿ {financeTotals.exp.toLocaleString()}</span>
              </div>
            </div>

            {/* INCOME */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold">Income today:</span>
                <button 
                  onClick={() => addFinRow('INC')}
                  className="text-[9px] text-stone-300 hover:text-stone-900 flex items-center gap-1 transition-colors"
                  style={mono}
                >
                  <Plus size={10} /> ADD
                </button>
              </div>
              <div className="space-y-2">
                {finRows.filter(r => r.type === 'INC').map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_72px_14px] gap-2 items-center">
                    <input 
                      type="text" 
                      className={LI} 
                      value={row.desc}
                      onChange={(e) => {
                        const idx = finRows.findIndex(r => r.id === row.id);
                        updateFinRow(idx, 'desc', e.target.value);
                      }}
                      placeholder="Description"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-stone-400" style={mono}>฿</span>
                      <input 
                        type="number" 
                        className={MI} 
                        value={row.amount || ''}
                        onChange={(e) => {
                          const idx = finRows.findIndex(r => r.id === row.id);
                          updateFinRow(idx, 'amount', e.target.value);
                        }}
                      />
                    </div>
                    <button onClick={() => deleteFinRow(row.id)} className="text-stone-300 hover:text-stone-900 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-y border-stone-200 py-1.5 flex justify-between items-center" style={mono}>
                <span className="text-[10px] uppercase font-medium">Total Received</span>
                <span className="text-[13px] font-bold">฿ {financeTotals.inc.toLocaleString()}</span>
              </div>
            </div>

            {/* NET BALANCE */}
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200 mb-8">
              <div className="flex justify-between items-center">
                <SLabel className="mb-0">Net Balance</SLabel>
                <span className={`text-lg font-black ${financeTotals.net >= 0 ? 'text-stone-900' : 'text-stone-400'}`} style={mono}>
                  {financeTotals.net < 0 ? '-' : ''}฿ {Math.abs(financeTotals.net).toLocaleString()}
                </span>
              </div>
            </div>

            {/* MENTAL WEALTH (REFLECTION) */}
            <div className="border-t-2 border-stone-900 pt-4">
              <SLabel>Mental Wealth (Reflection)</SLabel>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] text-stone-500 italic">Today's mood (circle):</span>
                <div className="flex gap-1.5">
                  {moods.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => setMoodPm(i)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all border ${
                        moodPm === i ? 'bg-stone-900 border-stone-900' : 'border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Best thing today:", key: "best" },
                  { label: "What I learned / want to improve:", key: "improve" },
                  { label: "One thing I'm proud of today:", key: "proud" }
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <span className="text-[9px] text-stone-400 whitespace-nowrap">{item.label}</span>
                    <input 
                      type="text" 
                      className={LI} 
                      value={(reflection as any)[item.key]}
                      onChange={(e) => setReflection({ ...reflection, [item.key]: e.target.value })}
                      placeholder="..."
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <span className="text-[10px] font-bold block mb-2">Key priorities for tomorrow:</span>
                <div className="space-y-2">
                  <input 
                    type="text" 
                    className={LI} 
                    value={reflection.tomorrow1}
                    onChange={(e) => setReflection({ ...reflection, tomorrow1: e.target.value })}
                    placeholder="Priority 1"
                  />
                  <input 
                    type="text" 
                    className={LI} 
                    value={reflection.tomorrow2}
                    onChange={(e) => setReflection({ ...reflection, tomorrow2: e.target.value })}
                    placeholder="Priority 2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. FOOTER BAR */}
        <footer className="px-5 py-3 flex justify-between items-center bg-white">
          <div className="flex flex-col">
            <span className="text-[8px] text-stone-300 uppercase tracking-widest" style={mono}>
              5 Wealth Planner · {formatDate(currentDate)}
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-1.5 bg-stone-100 text-stone-600 rounded px-3 py-1.5 text-[9px] uppercase tracking-widest hover:bg-stone-200 transition-colors" 
              style={mono}
            >
              <Download size={10} /> PDF
            </button>
            <button 
              onClick={exportToSheet}
              className="flex items-center gap-1.5 bg-stone-100 text-stone-600 rounded px-3 py-1.5 text-[9px] uppercase tracking-widest hover:bg-stone-200 transition-colors" 
              style={mono}
            >
              <TableIcon size={10} /> SHEET
            </button>
            <button className="bg-stone-900 text-white rounded px-5 py-2 text-[9px] uppercase tracking-widest hover:bg-stone-800 transition-colors" style={mono}>
              Save Day
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
