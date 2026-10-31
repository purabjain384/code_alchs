'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { VitalsCard } from '@/components/VitalsCard';
import { TrimesterProgressRail } from '@/components/TrimesterProgressRail';
import { AudioAdvisoryPlayer } from '@/components/AudioAdvisoryPlayer';
import { EmergencySosModal } from '@/components/EmergencySosModal';
import { MOCK_DAILY_TASKS, MOCK_MOTHERS } from '@/data/mockData';
import { DailyCareTask } from '@/types';

export default function MotherCompanionPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [tasks, setTasks] = useState<DailyCareTask[]>(MOCK_DAILY_TASKS);

  const motherRecord = MOCK_MOTHERS[0]; // Sunita Devi

  const toggleTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="companion-view"
        onOpenSosModal={() => setSosModalOpen(true)}
      />

      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Global Header */}
        <Header
          currentRole="mother"
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSosModal={() => setSosModalOpen(true)}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Reassurance Strip */}
          <div className="w-full bg-surface-container-low px-4 py-2.5 rounded-xl shadow-xs border border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-secondary uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary-container/40 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">favorite</span>
                माँ की सुरक्षा • MatruRaksha Companion
              </span>
              <span className="text-on-surface-variant hidden sm:inline">|</span>
              <span className="text-on-surface-variant flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  verified_user
                </span>
                ABHA ID: 91-4432-8810-9281
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSosModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error text-on-error font-bold shadow-xs hover:bg-error/90 active:scale-95 transition-all text-xs"
            >
              <span className="material-symbols-outlined text-[15px]">e911_emergency</span>
              <span>108 Emergency Call</span>
            </button>
          </div>

          {/* Welcome & Greeting Card */}
          <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-tertiary-fixed/30 blur-xl pointer-events-none" />

            <div className="flex items-start md:items-center gap-5 z-10">
              <div className="relative shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-md ring-4 ring-secondary/20 relative">
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-qZZP5-DvCb79lGhuvaOca3JNHD09ts7FPxBHpSrr0cMfzUl_nLn6tz9mp050qnlAXTKMiUH0WWWNeumuz64lTVuhmOIrBysaVCUP_R_Dvk9p2tkPVk9k28IN_bMU92KkJmtQjdgTYokB3oZmnX82PkIScFm6FoPgmFjiv2BR4gGN5tkbtpUXIZ-zBc2pLWrGHf-omtEC33NXfrwulXmnMbJRpN9OdupQS7bNjZjw"
                    alt="Sunita Devi"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="absolute bottom-0 right-0 bg-secondary text-on-secondary w-7 h-7 rounded-full flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[16px]">eco</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl lg:text-3xl font-extrabold text-primary-container tracking-tight">
                    नमस्ते सुनीता जी!
                  </h1>
                  <span className="text-base text-on-surface-variant font-medium">
                    (Namaste, Sunita!)
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-secondary font-semibold">
                  आपकी मातृत्व यात्रा, हर कदम पर सुरक्षित{' '}
                  <span className="text-on-surface-variant font-normal">
                    • Your pregnancy journey, supported every step.
                  </span>
                </p>

                {/* Care Circle Contacts */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-xs font-semibold text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      diversity_1
                    </span>
                    <span>ASHA: <strong>सुनीता दीदी (Sunita Didi)</strong></span>
                    <a
                      href="tel:9829012345"
                      className="text-secondary font-bold underline ml-1 hover:text-secondary/80 flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      98290-12345
                    </a>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-xs font-semibold text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-primary-container">
                      medical_services
                    </span>
                    <span>MO: <strong>Dr. Priya Sharma</strong> (Raigad PHC)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Playful Weekly Growth Milestone Widget */}
            <div className="z-10 bg-surface-container-low rounded-2xl p-4 flex items-center gap-4 shadow-xs border border-outline-variant/20 lg:max-w-xs shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-3xl shadow-inner shrink-0">
                🍆
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-secondary uppercase font-extrabold tracking-wider">
                  सप्ताह 28 / Week 28
                </span>
                <p className="text-xs font-bold text-on-surface leading-tight mt-0.5">
                  आपका नन्हा शिशु बैंगन (Eggplant) के आकार का है!
                </p>
                <span className="text-[11px] text-on-surface-variant mt-0.5">
                  वजन ~ 1.0 kg | लंबाई ~ 37.6 cm
                </span>
              </div>
            </div>
          </div>

          {/* Hero Pregnancy Progress & Trimester Timeline Card */}
          <TrimesterProgressRail
            currentWeek={motherRecord.gestationalWeek}
            eddDate={motherRecord.edd}
            daysRemaining={84}
            lastCheckupDate={motherRecord.lastVisitDate}
            nextCheckupDate={motherRecord.nextDueDate}
          />

          {/* Voice Advisory Card from ASHA Worker */}
          <AudioAdvisoryPlayer
            senderName="सुनीता दीदी (ASHA Sunita B.)"
            timestamp="Today, 10:15 AM"
            hindiMessage="नमस्ते सुनीता जी! आपकी अगली गर्भावस्था जाँच 5 नवंबर को निर्धारित है। कृपया समय पर अपनी जाँच करवाएँ और प्रतिदिन रात को भोजन के बाद आयरन की गोली लेना न भूलें।"
            englishTranslation="Hello Sunita ji! Your next antenatal visit is scheduled for 5 November. Please arrive on time and don't forget to take your daily iron tablet after dinner."
            onScheduleReminder={() => alert('Reminder scheduled for 8:00 PM tonight!')}
          />

          {/* Health & Vitals Overview */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-primary-container">
                  आपका स्वास्थ्य एवं महत्वपूर्ण जाँच (Your Vitals Summary)
                </h2>
                <p className="text-xs text-on-surface-variant">
                  आशा सुनीता दीदी द्वारा 24 अक्टूबर 2026 को ली गई जाँच रिपोर्ट
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/50 text-secondary text-xs font-bold self-start">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                सभी आँकड़े पूरी तरह सामान्य एवं स्वस्थ हैं
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <VitalsCard
                title="रक्तचाप (Blood Pressure)"
                value="120/80"
                unit="mmHg"
                subtitle="24 अक्टूबर को मापा गया"
                statusText="सामान्य (Normal)"
                statusType="success"
                icon="speed"
              />

              <VitalsCard
                title="माता का वजन (Weight)"
                value="62.5"
                unit="kg"
                subtitle="+8.5 kg स्वस्थ वृद्धि (Healthy Gain)"
                statusText="उचित पोषण स्तर"
                statusType="success"
                icon="scale"
              />

              <VitalsCard
                title="शिशु की धड़कन (Baby Heartbeat)"
                value="142"
                unit="bpm"
                subtitle="धड़कन प्रति मिनट (FHR)"
                statusText="स्वस्थ एवं सक्रिय"
                statusType="success"
                icon="cardiology"
              />

              <VitalsCard
                title="खून की मात्रा (Hemoglobin)"
                value="11.4"
                unit="g/dL"
                subtitle="लक्ष्य: 11.0 g/dL से ऊपर"
                statusText="पर्याप्त एवं सुरक्षित"
                statusType="success"
                icon="bloodtype"
              />
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center gap-3 text-xs text-on-surface">
              <span className="material-symbols-outlined text-secondary text-[24px]">
                thumb_up
              </span>
              <p className="leading-relaxed">
                <strong>आश्वासन:</strong> आपकी पिछली गृह-भेंट में सभी जाँच आशा सुनीता दीदी द्वारा दर्ज की गई थीं। आप और आपका शिशु दोनों बिल्कुल सुरक्षित और स्वस्थ हैं!
              </p>
            </div>
          </section>

          {/* Dual Bento: Daily Care Routine & Illustrated Nutrition Corner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7-Cols: Daily Care Routine */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/30 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                      दैनिक देखभाल एवं कार्यसूची
                    </span>
                    <h3 className="text-lg font-bold text-primary-container">
                      आज के नियम व आगामी रिमाइंडर्स (Daily Care Routine)
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-primary-container text-xs font-bold">
                    4 कार्य
                  </span>
                </div>

                <div className="space-y-3 pt-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${
                        task.completed
                          ? 'bg-secondary-container/20 border-secondary/30'
                          : 'bg-surface-container-low border-outline-variant/30 hover:bg-surface-container'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                          task.completed
                            ? 'bg-secondary text-on-secondary'
                            : 'bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {task.completed ? 'check' : task.icon}
                        </span>
                      </div>

                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`font-bold ${
                              task.completed
                                ? 'text-secondary line-through'
                                : 'text-on-surface'
                            }`}
                          >
                            {task.hindiTitle} ({task.title})
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              task.completed
                                ? 'bg-secondary text-on-secondary'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {task.badgeText || task.timeSlot}
                          </span>
                        </div>
                        <p className="text-on-surface-variant mt-1">
                          {task.hindiDescription || task.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 5-Cols: Nutrition & Danger Signs */}
            <div className="lg:col-span-5 space-y-4">
              {/* Nutrition Advice */}
              <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary-container text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">restaurant</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-primary-container">
                      पौष्टिक आहार परामर्श (Nutrition Corner)
                    </h4>
                    <span className="text-[11px] text-on-surface-variant">तीसरी तिमाही विशेष</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-on-surface-variant">
                  <div className="p-3 rounded-xl bg-surface-container-low flex items-start gap-2">
                    <span className="text-lg">🥬</span>
                    <div>
                      <strong className="text-on-surface block">हरी पत्तेदार सब्जियाँ:</strong>
                      पालक, मेथी, सहजन की पत्तियाँ हीमोग्लोबिन बढ़ाती हैं।
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-low flex items-start gap-2">
                    <span className="text-lg">🥜</span>
                    <div>
                      <strong className="text-on-surface block">दालें व चना-गुड़:</strong>
                      प्रोटीन और आयरन के लिए प्रतिदिन एक कटोरी भुना चना और गुड़ लें।
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-low flex items-start gap-2">
                    <span className="text-lg">🥛</span>
                    <div>
                      <strong className="text-on-surface block">दूध व छाछ:</strong>
                      कैल्शियम की पूर्ति हेतु दिन में 2 बार ताजा दूध अथवा मट्ठा पिएँ।
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Warning Signs Alert Box */}
              <div className="p-5 rounded-2xl bg-error-container/30 border border-error-container/60 text-xs space-y-2">
                <div className="flex items-center gap-2 text-error font-bold">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                  <span>खतरे के लक्षण (Danger Signs)</span>
                </div>
                <p className="text-on-error-container leading-relaxed">
                  यदि सिर में तेज दर्द, आँखों के आगे धुंधलापन, चेहरे पर सूजन या अचानक रक्तस्राव हो, तो तुरंत <strong>108 पर कॉल करें</strong> या प्राथमिक स्वास्थ्य केंद्र जाएँ।
                </p>
                <button
                  type="button"
                  onClick={() => setSosModalOpen(true)}
                  className="w-full mt-2 py-2 rounded-xl bg-error text-on-error font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">e911_emergency</span>
                  <span>108 इमरजेंसी रेफरल शुरू करें</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Emergency Modal */}
      <EmergencySosModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        initialMother={motherRecord}
      />
    </div>
  );
}

