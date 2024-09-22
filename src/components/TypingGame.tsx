import { useEffect, useRef, useState } from "react";

export default function TypingGame() {
    const text = "Photosynthesis is the process plants use to convert sunlight, carbon dioxide, and water into glucose and oxygen, providing energy for growth and releasing vital oxygen.";
    const [WPM, setWPM] = useState(0);
    const [gameFinished, setGameFinished] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [writtenText, setWrittenText] = useState<JSX.Element[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [mistakeCount, setMistakeCount] = useState(0);
    const [accuracy, setAccuracy] = useState(0);

    const caretRef = useRef<HTMLDivElement>(null);

    /**Loads the text, adjusts the input caret, and starts a timer */
    function startGame() {
        const content = Array.from(text).map((letter, index) => {
            return (
                <span
                    key={index}
                    className={`letter ${index === 0 ? "active" : ""}`}
                    style={{
                        color: letter !== " " ? "black" : "transparent",
                    }}>
                    {letter}
                </span>
            );
        });
        setStartTime(Date.now());
        setWrittenText(content);
        adjustCaret();
    }

    /**
     * Like start game, but it also resets the states that change, and the
     * html classes that were modified during the previous game
     */
    function restartGame() {
        setStartTime(Date.now());
        setGameFinished(false);
        setCurrentIndex(0);
        setWPM(0);
        // Reset the colors of the right and wrong letters.
        const letters = document.querySelectorAll(".letter");
        letters.forEach((letter) => {
            letter.classList.remove("active");
            letter.classList.remove("right");
            letter.classList.remove("wrong");
        });
        // Make the first letter active again => adjustCaret() depends on an active letter
        letters[0].classList.add("active");

        // Restart caret position
        adjustCaret();
    }

    /**
     * For each key detected shift an index to the right
     * If the key pressed is the letter to type => shifts index
     * If key pressed is not the letter to type => shifts index & tracks a mistake
     * @param key
     * @returns
     */
    function handleTyping(key: string) {
        // Spans
        const letters = document.querySelectorAll(".letter");
        const currentChar = text[currentIndex];

        // Restart
        if (key == "Escape") {
            restartGame();
            return;
        }

        if (gameFinished) return;
        // If backspace pressed shift index to the left
        if (key === "Backspace" && currentIndex > 0 && currentIndex != letters.length) {
            // Remove the right or wrong class to the previously typed letter if backspace pressed
            if (letters[currentIndex - 1].classList.contains("right")) {
                letters[currentIndex - 1].classList.remove("right");
            } else if (letters[currentIndex - 1].classList.contains("wrong")) {
                letters[currentIndex - 1].classList.remove("wrong");
            }
            letters[currentIndex].classList.remove("active");
            letters[currentIndex - 1].classList.add("active");

            setCurrentIndex(currentIndex - 1);
            return;
        }

        // If key isn't letter.
        if (key.length != 1 && key.match(/[a-z]/i)) {
            return;
        }

        // Shift index to the right, whether the input was right or wrong
        if (key === currentChar) {
            letters[currentIndex].classList.add("right");
            setCurrentIndex(currentIndex + 1);
        } else if (key !== currentChar) {
            letters[currentIndex].classList.add("wrong");
            // User does a mistake, but index position keeps going
            setCurrentIndex(currentIndex + 1);
            letters[currentIndex].classList.remove("active");
            setMistakeCount(mistakeCount + 1);
        }

        // ===== GAME FINISHED =====
        // Keep shifting the active class until the game is finished.
        if (currentIndex + 1 == letters.length) {
            letters[currentIndex].classList.add("active");
            setGameFinished(true);
            calcWPM(countWords());
            calcAcc();
            adjustCaret();
        } else {
            letters[currentIndex + 1].classList.add("active");
            letters[currentIndex].classList.remove("active");
        }
    }

    /**  Finds the letter that has the active property, and places the caret left to that letter. */
    function adjustCaret() {
        const caret = caretRef.current;
        const activeChar = document.getElementsByClassName("active")[0] as HTMLSpanElement;

        if (activeChar && caret) {
            const rect = activeChar.getBoundingClientRect();
            caret.style.left = `${rect.left - 2}px`;
            caret.style.top = `${rect.top}px`;
            caret.style.height = `${rect.height}px`;
        }
    }

    /** Calculates Words per Minute
     * Counts the words.
     * Calculate the time elapsed in minutes
     * dividing the words by that time elapsed returns the words per minute
     */
    function countWords() {
        // Get all the letters
        const letters: NodeListOf<Element> = document.querySelectorAll("span.right, span.wrong");
        let validWord = true; // To track if current word is valid
        let wordCount = 0; // Count of valid words
        let inWord = false; // Track if we are inside a word

        // Count a word as valid until a mistake (class="wrong") is found inside a letter
        // If mistake found: ignore that letter
        letters.forEach((letter) => {
            if (letter.textContent == null) return;
            const isSpace = letter.textContent.trim() === ""; // Check if span is a space

            if (isSpace) {
                // If space is found, and previous word is valid increase wordcount
                if (inWord && validWord) {
                    wordCount++;
                }
                // Reset
                inWord = false;
                validWord = true;
            } else {
                inWord = true;

                // If the current span has class 'wrong', invalidate the word
                if (letter.classList.contains("wrong")) {
                    validWord = false;
                }
            }
        });

        // checks if the last word was valid and counts it if so
        if (inWord && validWord) {
            wordCount++;
        }
        return wordCount;
    }

    /**
     * Calculates the words per minute by counting the words typed correctly and diving them by the ellapsed time
     * (finishTime - startTime) in minutes
     */
    function calcWPM(wordCount: number) {
        if (startTime == null) return;
        const letters: NodeListOf<Element> = document.querySelectorAll("span.right, span.wrong");
        const letterCount = document.querySelectorAll(".letter");
        // Further checks if game finished
        if (letterCount.length == letters.length) {
            const timeEllapsedMin = (Date.now() - startTime) / (1000 * 60);
            setWPM(Math.round(wordCount / timeEllapsedMin));
        }
    }

    /**
     * Calculate the accuracy:
     * Based on formula: Accuracy[%] =  ((Number total letters - number mistakes) / Number total letters) * 100
     */
    function calcAcc() {
        const letterCount = document.querySelectorAll(".letter").length;
        setAccuracy(Math.round(((letterCount - mistakeCount) / letterCount) * 100));
    }

    // Runs startGame() once at the beginning
    useEffect(() => {
        startGame();
    }, []);

    // Listens to key presses and runs handleTyping
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            handleTyping(e.key);
            adjustCaret();
        }

        document.addEventListener("keydown", handleKeyDown);

        return function cleanup() {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [currentIndex, gameFinished, startTime, handleTyping]);

    //
    return (
        <>
            <div className="game-container">
                {gameFinished ? "" : <div ref={caretRef} className="caret"></div>}
                {writtenText}
                {gameFinished ? (
                    <div>
                        <h3>Results: </h3>
                        <p style={{ alignItems: "center" }}>WPM: {WPM}</p>
                        <p style={{ alignItems: "center" }}>Accuracy: {accuracy}%</p>
                        <p style={{ alignItems: "center" }}>Press ESC to reset</p>
                    </div>
                ) : (
                    <br></br>
                )}
            </div>
        </>
    );
}
