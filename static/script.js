// GSAP animations
gsap.from(".hero-text h1", {
  opacity: 0,
  y: -40,
  duration: 1,
  delay: 0.3
});

gsap.from(".tagline", {
  opacity: 0,
  y: 20,
  duration: 1,
  delay: 0.6
});

gsap.from(".cta-btn", {
  opacity: 0,
  scale: 0.9,
  duration: 0.8,
  delay: 0.9,
  ease: "back.out(1.7)"
});

// Dashboard animations


//Greating page GSAP
// Greeting animation
gsap.from(".greeting-box", {
  opacity: 0,
  y: 40,
  duration: 1.4,
  ease: "power2.out"
});

// Scroll-triggered features section
gsap.utils.toArray("[data-scroll]").forEach(elem => {
  gsap.from(elem, {
    scrollTrigger: {
      trigger: elem,
      start: "top 80%",
      toggleActions: "play none none reverse"
    },
    opacity: 0,
    y: 40,
    duration: 0.8,
    ease: "power1.out"
  });
});


// const toggleBtn = document.getElementById("modeToggle");
// const root = document.documentElement;

// Get saved theme from localStorage
// const savedTheme = localStorage.getItem("theme");
// const defaultTheme = savedTheme || "light";

// Apply saved or default theme
// root.setAttribute("data-theme", defaultTheme);
// toggleBtn.textContent = defaultTheme === "dark" ? "🌙" : "☀️";

// Toggle and save theme
// toggleBtn.addEventListener("click", () => {
//   const currentTheme = root.getAttribute("data-theme");
//   const newTheme = currentTheme === "dark" ? "light" : "dark";

//   root.setAttribute("data-theme", newTheme);
//   localStorage.setItem("theme", newTheme); // Save to localStorage
//   toggleBtn.textContent = newTheme === "dark" ? "🌙" : "☀️";
// });


document.addEventListener('DOMContentLoaded', () => {
  const summaryScript = document.getElementById('summary-data');
  if (!summaryScript) return;
  const summary = JSON.parse(summaryScript.textContent);

  // console.log(summary);

  // Fill in summary text
  document.getElementById('totalSpent').textContent = `$${summary.total_spent}`;
  document.getElementById('monthlySpent').textContent = `$${summary.monthly_spent}`;
  document.getElementById('topCategory').textContent = summary.top_category;

  // Animate overview card
  gsap.from("#overviewCard", {
    opacity: 0,
    y: 30,
    duration: 1,
    delay: 0.3,
    ease: "power2.out"
  });

  // Initialize chart
  const canvas = document.getElementById('expenseChart');

  if (!canvas) {
    console.warn('expenseChart canvas not found');
    return;
  }

  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: summary.chart_data.labels,
      datasets: [{
        data: summary.chart_data.values,
        backgroundColor: [
          '#4e73df',
          '#1cc88a',
          '#36b9cc',
          '#f6c23e',
          '#e74a3b',
          '#858796'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
});
