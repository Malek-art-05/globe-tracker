//  Turn milliseconds into a countdown string like "T-1d 02:03:04" or "T+00:00:00"
function formatCountdown(ms) {
  const sign = ms >= 0 ? 'T-' : 'T+';
  let seconds = Math.floor(Math.abs(ms) / 1000);

  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const two = (n) => String(n).padStart(2, '0');
  const dayStr = days > 0 ? `${days}d ` : '';
  return `${sign}${dayStr}${two(hours)}:${two(minutes)}:${two(seconds)}`;
}

//  Show a list of launches in the given container. The upcoming parameter is an array of launch objects, and onSelect is a callback function that will be called with the selected launch when a launch is clicked.
export function showLaunchList(container, upcoming, onSelect) {
    const now = Date.now();
    const soon = upcoming
    .filter((launch) => new Date(launch.net).getTime() > now - 60 * 60 * 1000) // Filter out launches that are more than 1 hour in the past
    .sort((a, b) => new Date(a.net).getTime() - new Date(b.net).getTime())
    .slice(0, 10); // Show only the next 10 launches

    const title = document.createElement('h3');
    title.textContent = 'Upcoming Launches';
    container.appendChild(title);
    
    if (soon.length === 0) {
        container.append('No upcoming launches. Run "npm run fetch:launches".');
        return;
    }

const countdowns = []; // { element, time } for each row, so tick() can update them

for (const launch of soon) {
    const row = document.createElement('div');
    row.className = 'launch';

    const name = document.createElement('div');
    name.className = 'launch-name';
    name.textContent = launch.name;

    const details = document.createElement('div');
    details.className = 'launch-details';
   details.textContent = `${launch.provider} · ${launch.status}`;

    const countdown = document.createElement('div');
    countdown.className = 'launch-countdown';

    row.append(name, details, countdown);
    row.addEventListener('click', () => onSelect(launch));
    container.appendChild(row);

    countdowns.push({ element: countdown, time: new Date(launch.net).getTime() });
}

//update countdowns every second
function tick() {
    const nowMs = Date.now();
    for (const { element, time } of countdowns) {
        element.textContent = formatCountdown(time - nowMs);
    }
}
tick();
setInterval(tick, 1000);
}