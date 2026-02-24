// Múi giờ Vietnam (UTC+7).
const TZ = "Asia/Ho_Chi_Minh";
const UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

function now() {
  return new Date();
}

function nowInVN() {
  const d = new Date();
  const vn = new Date(d.getTime() + UTC_OFFSET_MS);
  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth(),
    date: vn.getUTCDate(),
    hours: vn.getUTCHours(),
    minutes: vn.getUTCMinutes(),
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateAtVNDate(year, month, date, hour, minute) {
  const s = `${year}-${pad(month + 1)}-${pad(date)}T${pad(hour)}:${pad(minute)}:00+07:00`;
  return new Date(s);
}

function todayAtVN(hour, minute) {
  const n = nowInVN();
  let d = dateAtVNDate(n.year, n.month, n.date, hour, minute);
  if (d.getTime() <= Date.now()) {
    d = dateAtVNDate(n.year, n.month, n.date + 1, hour, minute);
  }
  return d;
}

function tomorrowAtVN(hour, minute) {
  const n = nowInVN();
  return dateAtVNDate(n.year, n.month, n.date + 1, hour, minute);
}

function addMinutes(mins) {
  return new Date(Date.now() + mins * 60 * 1000);
}

function formatVN(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString("vi-VN", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}
function formatUTC(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateVN(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("vi-VN", {
    timeZone: TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function hoursAgoVN(hours) {
  const d = new Date(Date.now() - hours * 60 * 60 * 1000);
  return d.toISOString();
}

function daysAgoVN(days) {
  const n = nowInVN();
  const d = dateAtVNDate(n.year, n.month, n.date - days, 0, 0);
  return d.toISOString();
}

function getVNDateParts(date) {
  const d = date instanceof Date ? date : new Date(date);
  const vn = new Date(d.getTime() + UTC_OFFSET_MS);
  return {
    day: vn.getUTCDate(),
    month: vn.getUTCMonth() + 1,
    hour: vn.getUTCHours(),
    minute: vn.getUTCMinutes(),
  };
}

module.exports = {
  TZ,
  formatUTC,
  now,
  nowInVN,
  dateAtVNDate,
  todayAtVN,
  tomorrowAtVN,
  addMinutes,
  formatVN,
  formatDateVN,
  hoursAgoVN,
  daysAgoVN,
  getVNDateParts,
};
