import React, { useState, useEffect, useRef  } from "react";

const WEEKDAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

export const MONTHDAYS = [
  { value: 1 },
  { value: 2 },
  { value: 3 },
  { value: 4 },
  { value: 5 },
  { value: 6 },
  { value: 7 },
  { value: 8 },
  { value: 9 },
  { value: 10 },
  { value: 11 },
  { value: 12 },
  { value: 13 },
  { value: 14 },
  { value: 15 },
  { value: 16 },
  { value: 17 },
  { value: 18 },
  { value: 19 },
  { value: 20 },
  { value: 21 },
  { value: 22 },
  { value: 23 },
  { value: 24 },
  { value: 25 },
  { value: 26 },
  { value: 27 },
  { value: 28 },
  { value: 29 },
  { value: 30 },
  { value: 31 },
];

const MONTHS = [
  { label: "Jan", value: 1 },
  { label: "Feb", value: 2 },
  { label: "Mar", value: 3 },
  { label: "Apr", value: 4 },
  { label: "May", value: 5 },
  { label: "Jun", value: 6 },
  { label: "Jul", value: 7 },
  { label: "Aug", value: 8 },
  { label: "Sep", value: 9 },
  { label: "Oct", value: 10 },
  { label: "Nov", value: 11 },
  { label: "Dec", value: 12 }
];

function pad2(num) {
  return num.toString().padStart(2, "0");
}

function timeToCron(time) {
  // time is "HH:MM"
  const [h, m] = time.split(":");
  return { hour: parseInt(h), minute: parseInt(m) };
}

export function ScheduleEditor() {
  const [mode, setMode] = useState("daily"); // daily, weekly, monthly, custom
  const [cursorLine, setCursorLine] = useState(1);
  const textareaRef = useRef(null);
  const [everyXMinutes, setEveryXMinutes] = useState("");
  const [dailyTimes, setDailyTimes] = useState(["", ""]);
  const [weeklyDays, setWeeklyDays] = useState([]);
  const [monthlyDays, setMonthlyDays] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [savedCrons, setSavedCrons] = useState("");

  // Helpers
  function toggleWeekday(dayValue, targetArray, setTargetArray) {
    if (targetArray.includes(dayValue)) {
      setTargetArray(targetArray.filter((d) => d !== dayValue));
    } else {
      setTargetArray([...targetArray, dayValue].sort((a, b) => a - b));
    }
  }

  function handleCursorChange(e) {
    const textarea = e.target;
    const pos = textarea.selectionStart; // cursor position (character index)
    const textUpToPos = textarea.value.slice(0, pos);
    const line = textUpToPos.split("\n").length; // lines before cursor + 1
    setCursorLine(line);
  }

  // Generate cron lines from UI state
  function generateCronLines() {
      let crons = [];
      const hours = dailyTimes
          .filter(t => t)
          .map(t => timeToCron(t).hour)
          .filter((value, index, self) => self.indexOf(value) === index);

      const specificMinutes = dailyTimes
          .filter(t => t)
          .map(t => timeToCron(t).minute)
          .filter((value, index, self) => self.indexOf(value) === index);

      let minuteExpressionList = [];
      let hourExpressionList = [];

      // Generate minute expression
      if (everyXMinutes && Number(everyXMinutes) > 0) {
          if (specificMinutes.length === 0) {
              minuteExpressionList.push(`*/${everyXMinutes}`);
          } else {
              specificMinutes.forEach(minute => {
                  if (minute === 0 || minute === "") {
                      minuteExpressionList.push(`*/${everyXMinutes}`);
                  } else {
                      const startMinute = Number(minute);
                      const additionalMinutes = [];
                      for (let i = startMinute; i < 60; i += Number(everyXMinutes)) {
                          additionalMinutes.push(i);
                      }
                      minuteExpressionList.push(additionalMinutes.join(','));
                  }
              });
          }
      } else {
          if (specificMinutes.length === 0) {
              minuteExpressionList.push('*');
              if (hours.length > 1) {
                  minuteExpressionList.push('*');
                  minuteExpressionList.push('*');
              }
          } else if(specificMinutes.length === 1) {
              minuteExpressionList.push(specificMinutes[0]);
          }
          else if (specificMinutes[0] === specificMinutes[1]) {
              minuteExpressionList.push(specificMinutes[0]);
              minuteExpressionList.push(specificMinutes[1]);
          } else if (specificMinutes[0] !== specificMinutes[1]) {
              minuteExpressionList.push(specificMinutes[0]);
              minuteExpressionList.push(specificMinutes[1]);
          }
      }

      // Generate hour expression
      if (hours.length === 1) {
          hourExpressionList.push(hours[0]); // Single hour
      } else if (hours.length > 1) {
          if (specificMinutes.every(min => min === 0)) {
              hourExpressionList.push(hours.join(',')); // All minutes are 00
          } else if (specificMinutes.length === 1) { // Check if first and second specific minutes are equal
              hourExpressionList.push(hours.join(',')); // Join hours if specific minutes are equal
          } else {
              hourExpressionList.push(hours[0]);
              hourExpressionList.push(hours[1]);
          }
      } else {
          hourExpressionList.push('*'); // No hours, so use '*'
      }

      // Generate CRON expressions based on constructed hour and minute expressions
      if (mode === "daily") {
          minuteExpressionList.forEach((minuteExpression, index) => {
              const hourExpression = hourExpressionList[index] || '*'; // Default to '*' if no hour for that minute
              crons.push(`${minuteExpression} ${hourExpression} * * *`);
          });
      } else if (mode === "weekly") {
          // Generate CRON expressions based on selected weekdays
          const daysString = weeklyDays.length > 0 ? weeklyDays.join(',') : '*'; // Use '*' if no weekdays selected
          minuteExpressionList.forEach((minuteExpression, index) => {
              const hourExpression = hourExpressionList[index] || '*'; // Default to '*' if no hour for that minute
              crons.push(`${minuteExpression} ${hourExpression} * * ${daysString}`); // Generate CRON expression
          });
      } else if (mode === "monthly") {
          // If both monthlyDays and selectedMonths are empty, we can set them to '*' in the CRON expression
          const monthDaysString = monthlyDays.length > 0 ? monthlyDays.join(',') : '*';
          const monthsString = selectedMonths.length > 0 ? selectedMonths.join(',') : '*';

          minuteExpressionList.forEach((minuteExpression, index) => {
              const hourExpression = hourExpressionList[index] || '*';
              crons.push(`${minuteExpression} ${hourExpression} ${monthDaysString} ${monthsString} *`);
          });
      } else if (mode === "custom") {
          // Generate a custom CRON expression based on selected days, months, and weekdays
          const monthDaysString = monthlyDays.length > 0 ? monthlyDays.join(',') : '*';
          const monthsString = selectedMonths.length > 0 ? selectedMonths.join(',') : '*';
          const daysString = weeklyDays.length > 0 ? weeklyDays.join(',') : '*';

          minuteExpressionList.forEach((minuteExpression, index) => {
              const hourExpression = hourExpressionList[index] || '*';
              crons.push(`${minuteExpression} ${hourExpression} ${monthDaysString} ${monthsString} ${daysString}`);
          });
      }
      return crons;
  }

  function validateAll(cronLine) {
  const parts = cronLine.trim().split(/\s+/);
  if (parts.length !== 5) {
    alert("Cron expression must have exactly 5 fields");
    return false;
  }
  const [min, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Validators for each field
  const isValidMinute = validateCronField(min, 0, 59);
  const isValidHour = validateCronField(hour, 0, 23);
  const isValidDayOfMonth = validateCronField(dayOfMonth, 1, 31);
  const isValidMonth = validateCronField(month, 1, 12);
  const isValidDayOfWeek = validateCronField(dayOfWeek, 0, 7); // 0 or 7 = Sunday

  if (!isValidMinute) {
    alert("Invalid minute field");
    return false;
  }
  if (!isValidHour) {
    alert("Invalid hour field");
    return false;
  }
  if (!isValidDayOfMonth) {
    alert("Invalid day of month field");
    return false;
  }
  if (!isValidMonth) {
    alert("Invalid month field");
    return false;
  }
  if (!isValidDayOfWeek) {
    alert("Invalid day of week field");
    return false;
  }

  return true;
}

// Helper function to validate a single cron field
function validateCronField(field, minAllowed, maxAllowed) {
  if (field === "*") return true;

  // Handle step values like */5
  if (field.startsWith("*/")) {
    const stepValue = field.slice(2);
    return isPositiveInteger(stepValue) && Number(stepValue) >= 1;
  }

  // Split by comma for lists
  const parts = field.split(",");
  for (const part of parts) {
    // each part should be a number within range
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    if (num < minAllowed || num > maxAllowed) return false;
  }

  return true;
}

function isPositiveInteger(str) {
  return /^\d+$/.test(str) && Number(str) > 0;
}

  // On Save button
  function handleSave() {
    const crons = generateCronLines();
    if (crons.length === 0) {
      alert("No schedule selected or incomplete data.");
      return;
    }
    setSavedCrons(crons.join("\n"));
  }

  // Simple parser for loading cron lines to UI
  function parseCronLine(cron) {
    const parts = cron.trim().split(" ");
    if (parts.length !== 5) return null;

    const [min, hour, dayOfMonth, month, dayOfWeek] = parts;

    if (typeof min !== 'string') {
        return null; // Handle unexpected input
    }

    const minutes = min.includes(',') ? min.split(',').map(Number) : [Number(min)];
    const hours = hour.includes(',') ? hour.split(',').map(Number) : [Number(hour)];

    let everyXMinutes = "";
    let minute_val = "00";
    let second_minute_val = "00";
    const [first, second] = minutes;

    // Handle minutes expression
    if (min === '*') {
        everyXMinutes = "";
        minute_val = "00";
    } else if (min.startsWith("*/")) {
        everyXMinutes = min.slice(2);
        minute_val = "00";
    } else if (min.includes(',')) {
        everyXMinutes = String(second - first);
        minute_val = `${pad2(first)}`;
        second_minute_val = `${pad2(second)}`;
    } else {
        minute_val = `${pad2(first)}`;
        if (!hour.includes(',')) {
            minute_val = `${pad2(first)}`;
            second_minute_val = `00`;
        } else {
            minute_val = `${pad2(first)}`;
            second_minute_val = `${pad2(first)}`;
        }
    }

    // Extract hours expression
    let hour_val = "00";
    let second_hour_val = "00";
    const [firstHour, secondHour] = hours;

    // Handle hours expression
    if (hour === '*') {
        hour_val = "00";
        second_hour_val = "00";
    } else if (hour.includes(',')) {
        hour_val = `${pad2(firstHour)}`;
        second_hour_val = `${pad2(secondHour)}`;
    } else {
        hour_val = `${pad2(firstHour)}`;
        if (min.includes(',')) {
            second_hour_val = `${pad2(firstHour)}`;
        }
    }

    const daysOfWeek = dayOfWeek.split(",").map(Number);
    const days = dayOfMonth.split(",").map(Number);
    const months = month.split(",").map(Number);

    // Return based on the mode
    if (dayOfMonth === "*" && dayOfWeek === "*" && month === "*") {
        return {
            mode: "daily",
            everyXMinutes,
            dailyTimes: [`${hour_val}:${minute_val}`, `${second_hour_val}:${second_minute_val}`],
        };
    } else if (dayOfMonth === "*" && dayOfWeek !== "*" && month === "*") {
        return {
            mode: "weekly",
            weeklyDays: daysOfWeek,
            everyXMinutes,
            dailyTimes: [`${hour_val}:${minute_val}`, `${second_hour_val}:${second_minute_val}`],
        };
    } else if (dayOfWeek === "*") {
        return {
            mode: "monthly",
            monthlyDays: days,
            selectedMonths: months,
            everyXMinutes,
            dailyTimes: [`${hour_val}:${minute_val}`, `${second_hour_val}:${second_minute_val}`],
        };
    } else {
        return {
            mode: "custom",
            monthlyDays: days,
            selectedMonths: months,
            weeklyDays: daysOfWeek,
            everyXMinutes,
            dailyTimes: [`${hour_val}:${minute_val}`, `${second_hour_val}:${second_minute_val}`],
        };
    }

    return null;
}

// On Load button
function handleLoad() {
    const lines = savedCrons.split("\n").map((line) => line.trim()).filter(Boolean);
    const parsed = parseCronLine(lines[cursorLine - 1]);


    if (!parsed) {
        alert("Invalid CRON expression. Please enter an expression in a format * * * * * [[minute 1-59] [hour 1-23] [day of month 1-31] [month 1-12] [day of week 1-7]]");
        return;
    }

    const cronToLoad = lines[cursorLine - 1];

    if (!cronToLoad) {
        alert("No CRON expression found at the selected line.");
        return;
    }

    if (!validateAll(cronToLoad)) return; // Validate before proceeding
    // Set state based on detected mode
    setMode(parsed.mode);

    if (parsed.mode === "daily") {
        setEveryXMinutes(parsed.everyXMinutes);
        setDailyTimes(parsed.dailyTimes || []);
    } else if (parsed.mode === "weekly") {
        setWeeklyDays(parsed.weeklyDays || []);
        setEveryXMinutes(parsed.everyXMinutes);
        setDailyTimes(parsed.dailyTimes || []);
    } else if (parsed.mode === "monthly") {
        setMonthlyDays(parsed.monthlyDays || []);
        setSelectedMonths(parsed.selectedMonths || [])
        setEveryXMinutes(parsed.everyXMinutes);
        setDailyTimes(parsed.dailyTimes || []);
    } else if (parsed.mode === "custom") {
        setEveryXMinutes(parsed.everyXMinutes);
        setDailyTimes(parsed.dailyTimes || []);
        setMonthlyDays(parsed.monthlyDays || []);
        setSelectedMonths(parsed.selectedMonths || [])
        setWeeklyDays(parsed.weeklyDays || []);
    }
}

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans text-gray-900">
      <h1 className="text-2xl font-bold mb-3 text-center">Schedule Editor</h1>

      <div className="mb-6 flex justify-center space-x-5">
        {["daily", "weekly", "monthly", "custom"].map((m) => (
          <label key={m} className="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              className="form-radio h-3 w-3 text-blue-600 text-sm"
              checked={mode === m}
              onChange={() => setMode(m)}
            />
            <span className="ml-2 capitalize">{m}</span>
          </label>
        ))}
      </div>

      <div className="bg-white shadow rounded px-6 py-3 w-70 p-4 space-y-3 border border-gray-200 text-sm">
          <div className="flex items-center space-x-4">
            <label className="font-semibold whitespace-nowrap">
              Run every X minutes (leave empty to disable)
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 15"
              className="border rounded px-2 py-1 w-28 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              value={everyXMinutes}
              onChange={(e) => setEveryXMinutes(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-6">
            <label className="font-semibold whitespace-nowrap">
              Run at specific times (up to 2 times per day)
            </label>
            <div className="flex space-x-2">
              {[0, 1].map((idx) => (
                <input
                  key={idx}
                  type="time"
                  className="border rounded px-2 py-1 w-24 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  value={dailyTimes[idx] || ""}
                  onChange={(e) => {
                    const newTimes = [...dailyTimes];
                    newTimes[idx] = e.target.value;
                    setDailyTimes(newTimes);
                  }}
                />
              ))}
            </div>
          </div>
      </div>

      {/* Weekly */}
      {mode === "weekly" && (
        <div className="bg-white px-6 py-3 w-70 p-4 space-y-3 text-sm">
          <label className="block font-semibold mb-2">Select weekdays:</label>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map(({ label, value }) => (
              <div key={value}>
                <label className={"checkbox-label"}>
                  <input
                    type="checkbox"
                    checked={weeklyDays.includes(value)}
                    onChange={() => toggleWeekday(value, weeklyDays, setWeeklyDays)}
                    className="mb-1"
                  />
                  <span className="font-medium">{label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly */}
    {mode === "monthly" && (
      <div className="bg-white px-6 py-3 w-70 p-4 space-y-3 text-sm">
        <label className="block font-semibold mb-1">
          Select days of the month:
        </label>
        <div className="grid grid-cols-12 gap-1 text-center">
          {MONTHDAYS.map(({ value }) => (
            <div key={value}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={monthlyDays.includes(value)}
                  onChange={() => toggleWeekday(value, monthlyDays, setMonthlyDays)}
                  className="mb-1"
                />
                <span className="font-medium text-sm">
                  {value}
                </span>
              </label>
            </div>
          ))}
        </div>

        <label className="block font-semibold mb-1">
          Select months:
        </label>
        <div className="grid grid-cols-12 gap-1 text-center">
          {MONTHS.map(({ label, value }) => (
            <div key={value}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedMonths.includes(value)}
                  onChange={() => {
                      if (selectedMonths.includes(value)) {
                        setSelectedMonths(selectedMonths.filter(month => month !== value));
                      } else {
                        setSelectedMonths([...selectedMonths, value]);
                      }
                    }}
                  className="mb-1"
                />
                <span className="font-medium text-sm">
                  {label}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>
    )}

      {/* Custom */}
      {/* Custom */}
    {mode === "custom" && (
        <div className="bg-white px-6 py-3 w-70 p-4 space-y-3 text-sm">
            <label className="block font-semibold mb-1">
                Select days of the month:
            </label>
            <div className="grid grid-cols-12 gap-1 text-center">
                {MONTHDAYS.map(({ value }) => (
                    <div key={value}>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={monthlyDays.includes(value)}
                                onChange={() => toggleWeekday(value, monthlyDays, setMonthlyDays)}
                                className="mb-1"
                            />
                            <span className="font-medium text-sm">
                                {value}
                            </span>
                        </label>
                    </div>
                ))}
            </div>

            <label className="block font-semibold mb-1">
                Select months:
            </label>
            <div className="grid grid-cols-12 gap-1 text-center">
                {MONTHS.map(({ label, value }) => (
                    <div key={value}>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={selectedMonths.includes(value)}
                                onChange={() => {
                                    if (selectedMonths.includes(value)) {
                                        setSelectedMonths(selectedMonths.filter(month => month !== value));
                                    } else {
                                        setSelectedMonths([...selectedMonths, value]);
                                    }
                                }}
                                className="mb-1"
                            />
                            <span className="font-medium text-sm">
                                {label}
                            </span>
                        </label>
                    </div>
                ))}
            </div>

            <label className="block font-semibold mb-1">Select weekdays:</label>
            <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map(({ label, value }) => (
                    <div key={value}>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={weeklyDays.includes(value)}
                                onChange={() => toggleWeekday(value, weeklyDays, setWeeklyDays)}
                                className="mb-1"
                            />
                            <span className="font-medium">{label}</span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    )}

      {/* Save / Load */}
      <div className="mt-4 space-x-4 text-center">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
        >
          Save
        </button>
        <button
          onClick={handleLoad}
          className="px-6 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition"
        >
          Load
        </button>
      </div>
	    
      {/* Saved CRON Textarea */}
      <div className="mt-6">
	<p style={{ marginBottom: "4px", fontStyle: "italic", color: "#666" }}>
  	  To load and edit a CRON expression, select the line you want to modify.
        </p>
        <label className="block font-semibold mb-1 text-sm">Saved CRON expressions:</label>
        <textarea
          rows={3}
          className="w-full border rounded p-3 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          value={savedCrons}
          onChange={(e) => setSavedCrons(e.target.value)}
          placeholder="Your saved CRON expressions will appear here..."
          ref={textareaRef}
          onClick={handleCursorChange}
		  onKeyUp={handleCursorChange}
		  onSelect={handleCursorChange}
		  onInput={handleCursorChange}
        />
      </div>
    </div>
  );
}
