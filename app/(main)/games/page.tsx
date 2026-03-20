"use client";

import { useState } from "react";
import { ArrowLeft, Gamepad2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type RpsChoice = "keo" | "bua" | "bao";

const RPS_OPTIONS: Array<{ value: RpsChoice; label: string }> = [
  { value: "keo", label: "Kéo" },
  { value: "bua", label: "Búa" },
  { value: "bao", label: "Bao" },
];

const createGuessTarget = () => Math.floor(Math.random() * 20) + 1;
const getRandomRpsChoice = (): RpsChoice =>
  RPS_OPTIONS[Math.floor(Math.random() * RPS_OPTIONS.length)]!.value;

const getRpsLabel = (choice: RpsChoice) =>
  RPS_OPTIONS.find((item) => item.value === choice)?.label || choice;

export default function GamesPage() {
  const [guessTarget, setGuessTarget] = useState(() => createGuessTarget());
  const [guessInput, setGuessInput] = useState("");
  const [guessAttempts, setGuessAttempts] = useState(0);
  const [guessWins, setGuessWins] = useState(0);
  const [guessFeedback, setGuessFeedback] = useState(
    "Đoán số từ 1 đến 20 để bắt đầu.",
  );

  const [rpsStats, setRpsStats] = useState({ wins: 0, losses: 0, draws: 0 });
  const [rpsResult, setRpsResult] = useState("Chọn Kéo, Búa hoặc Bao.");

  const handleGuessSubmit = () => {
    const guess = Number.parseInt(guessInput, 10);

    if (!Number.isFinite(guess) || guess < 1 || guess > 20) {
      toast.error("Vui lòng nhập số từ 1 đến 20");
      return;
    }

    const nextAttempts = guessAttempts + 1;
    setGuessAttempts(nextAttempts);

    if (guess === guessTarget) {
      setGuessWins((prev) => prev + 1);
      setGuessFeedback(`Chuẩn luôn. Bạn đoán đúng số ${guessTarget}!`);
      setGuessTarget(createGuessTarget());
      setGuessAttempts(0);
      setGuessInput("");
      return;
    }

    if (nextAttempts >= 5) {
      setGuessFeedback(`Hết lượt. Đáp án là ${guessTarget}. Chơi ván mới nhé!`);
      setGuessTarget(createGuessTarget());
      setGuessAttempts(0);
      setGuessInput("");
      return;
    }

    setGuessFeedback(guess < guessTarget ? "Số lớn hơn nữa." : "Số nhỏ hơn nữa.");
    setGuessInput("");
  };

  const resetGuessGame = () => {
    setGuessTarget(createGuessTarget());
    setGuessInput("");
    setGuessAttempts(0);
    setGuessFeedback("Đã reset. Đoán lại số từ 1 đến 20.");
  };

  const handleRpsPlay = (playerChoice: RpsChoice) => {
    const computerChoice = getRandomRpsChoice();

    if (playerChoice === computerChoice) {
      setRpsStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
      setRpsResult(
        `Hòa rồi. Bạn chọn ${getRpsLabel(playerChoice)}, máy cũng chọn ${getRpsLabel(computerChoice)}.`,
      );
      return;
    }

    const win =
      (playerChoice === "keo" && computerChoice === "bao") ||
      (playerChoice === "bua" && computerChoice === "keo") ||
      (playerChoice === "bao" && computerChoice === "bua");

    if (win) {
      setRpsStats((prev) => ({ ...prev, wins: prev.wins + 1 }));
      setRpsResult(`Bạn thắng. Máy chọn ${getRpsLabel(computerChoice)}.`);
      return;
    }

    setRpsStats((prev) => ({ ...prev, losses: prev.losses + 1 }));
    setRpsResult(`Bạn thua. Máy chọn ${getRpsLabel(computerChoice)}.`);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 px-4 pb-8 pt-4 md:px-8 md:pt-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
          <div className="flex items-center gap-2 text-slate-900">
            <Gamepad2 className="h-5 w-5 text-blue-600" />
            <p className="text-lg font-bold">Mini game</p>
          </div>

          <Link href="/reels">
            <Button type="button" variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Quay lại Reels
            </Button>
          </Link>
        </div>

        <div className="grid w-full gap-4 md:grid-cols-2">
          <div className="space-y-4 rounded-3xl bg-white p-5 text-slate-900 shadow-sm ring-1 ring-slate-100">
            <div>
              <p className="text-lg font-bold">Đoán số</p>
              <p className="text-sm text-slate-500">
                Đoán số từ 1 đến 20. Mỗi ván tối đa 5 lượt.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={20}
                value={guessInput}
                onChange={(event) => setGuessInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleGuessSubmit();
                  }
                }}
                placeholder="Nhập số của bạn"
              />
              <Button type="button" onClick={handleGuessSubmit}>
                Đoán
              </Button>
            </div>

            <div className="rounded-xl bg-slate-100 p-3 text-sm">
              <p>{guessFeedback}</p>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Lượt còn lại: {Math.max(5 - guessAttempts, 0)}</span>
              <span>Ván thắng: {guessWins}</span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={resetGuessGame}
            >
              <RotateCcw className="h-4 w-4" />
              Chơi ván mới
            </Button>
          </div>

          <div className="space-y-4 rounded-3xl bg-white p-5 text-slate-900 shadow-sm ring-1 ring-slate-100">
            <div>
              <p className="text-lg font-bold">Oẳn tù tì</p>
              <p className="text-sm text-slate-500">
                Chọn kéo, búa hoặc bao để đấu với máy.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {RPS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  onClick={() => handleRpsPlay(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="rounded-xl bg-slate-100 p-3 text-sm">
              <p>{rpsResult}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-green-50 p-2 text-green-700">
                Thắng: {rpsStats.wins}
              </div>
              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                Hòa: {rpsStats.draws}
              </div>
              <div className="rounded-xl bg-red-50 p-2 text-red-700">
                Thua: {rpsStats.losses}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
