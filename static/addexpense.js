/**
 * add_expense.js — Expenso · Add Expense Page
 * Place at: static/js/add_expense.js
 * Depends on: dashboard.js (sidebar/toast helpers already loaded)
 */

/* ── DOM refs ─────────────────────────────────────────────── */
let form, amountInput, titleInput, categoryInput,dateInput, noteInput, noteCount, submitBtn, clearBtn;

// preview
let previewAmount,
    previewTitle,
    previewCat,
    previewCatEmoji,
    previewCatLabel,
    previewDate,
    previewNote,
    previewBadge;

/* ── Helpers ──────────────────────────────────────────────── */
const fmt = v => {
  const n = parseFloat(v);
  if (isNaN(n)) return '₹0.00';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = iso => {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return iso; }
};

function setFieldError(inputId, errorId, msg) {
  const input = document.getElementById(inputId);
  const errEl = document.getElementById(errorId);
  if (!input || !errEl) return;
  errEl.textContent = msg || '';
  if (msg) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
  } else {
    input.classList.remove('is-invalid');
    if (input.value) input.classList.add('is-valid');
  }
}

function clearFieldError(inputId, errorId) {
  setFieldError(inputId, errorId, '');
}

/* ── Category chips ───────────────────────────────────────── */
let selectedCatData = null;

/* ── Live preview update ──────────────────────────────────── */
function updatePreview() {
  if (!previewAmount) return;   // ← bail if DOM not ready yet

  const amount = amountInput?.value;
  const title  = titleInput?.value?.trim();
  const date   = dateInput?.value;
  const note   = noteInput?.value?.trim();
  const filled = amount && parseFloat(amount) > 0 && title && categoryInput?.value && date;

  previewAmount.textContent = fmt(amount);

  previewTitle.textContent = title || 'Transaction title';
  previewTitle.style.color = title ? 'var(--text-primary)' : 'var(--text-muted)';

  if (selectedCatData) {
    previewCatEmoji.textContent = selectedCatData.emoji;
    previewCatLabel.textContent = selectedCatData.label;
    previewCat.classList.add('has-cat');
  } else {
    previewCatEmoji.textContent = '💸';
    previewCatLabel.textContent = 'No category';
    previewCat.classList.remove('has-cat');
  }

  previewDate.textContent = fmtDate(date);
  previewNote.textContent = note || '';

  if (filled) {
    previewBadge.textContent = 'Ready';
    previewBadge.classList.add('ready');
  } else {
    previewBadge.textContent = 'Unsaved';
    previewBadge.classList.remove('ready');
  }
}

/* ── Note char counter ────────────────────────────────────── */
function updateCharCount() {
  const len = noteInput?.value?.length || 0;
  if (noteCount) {
    noteCount.textContent = `${len} / 400`;
    noteCount.style.color = len > 360 ? 'var(--rose)' : 'var(--text-muted)';
  }
}

/* ── Client-side validation ───────────────────────────────── */
function validateForm() {
  let valid = true;

  // Amount
  const amt = parseFloat(amountInput?.value);
  if (!amountInput?.value || isNaN(amt) || amt <= 0) {
    // amount field has no separate error span — shake the field visually
    amountInput?.classList.add('is-invalid');
    showToast('Please enter a valid amount.', 2200);
    valid = false;
  } else {
    amountInput?.classList.remove('is-invalid');
    amountInput?.classList.add('is-valid');
  }

  // Title
  if (!titleInput?.value?.trim()) {
    setFieldError('title', 'titleError', 'Title is required.');
    valid = false;
  } else {
    clearFieldError('title', 'titleError');
  }

  // Category
  if (!categoryInput?.value) {
    const errEl = document.getElementById('categoryError');
    if (errEl) errEl.textContent = 'Please select a category.';
    valid = false;
  } else {
    const errEl = document.getElementById('categoryError');
    if (errEl) errEl.textContent = '';
  }

  // Date
  if (!dateInput?.value) {
    setFieldError('date', 'dateError', 'Date is required.');
    valid = false;
  } else {
    clearFieldError('date', 'dateError');
  }

  return valid;
}

/* ── Form submission (AJAX) ───────────────────────────────── */

/* ── Clear / reset ────────────────────────────────────────── */
function resetForm() {
  form?.reset();
  // Re-set date to today
  const today = new Date().toISOString().split('T')[0];
  if (dateInput) dateInput.value = today;

  // Deselect category chips
  document.querySelectorAll('.ae-cat-chip').forEach(c => c.classList.remove('selected'));
  if (categoryInput) categoryInput.value = '';
  selectedCatData = null;

  // Clear validation states
  document.querySelectorAll('.ae-input').forEach(el => {
    el.classList.remove('is-valid', 'is-invalid');
  });
  document.querySelectorAll('.ae-field-error').forEach(el => el.textContent = '');

  updatePreview();
  updateCharCount();
}

clearBtn?.addEventListener('click', () => {
  if (confirm('Clear all fields?')) resetForm();
});

/* ── Bind live update events ──────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {

  const modal = document.getElementById("categoryModal");
  const openBtn = document.getElementById("openCustomCategory");
  const closeBtn = document.getElementById("closeCategoryModal");
  const cancelBtn = document.getElementById("cancelCategoryModal");

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      modal?.classList.add("active");
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal?.classList.remove("active");
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      modal?.classList.remove("active");
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  }
  form          = document.getElementById('addExpenseForm');
  amountInput   = document.getElementById('amount');
  titleInput    = document.getElementById('title');
  categoryInput = document.getElementById('category');
  dateInput     = document.getElementById('date');
  noteInput     = document.getElementById('note');
  noteCount     = document.getElementById('noteCount');
  submitBtn     = document.getElementById('submitBtn');
  clearBtn      = document.getElementById('clearBtn');


  previewAmount   = document.getElementById('previewAmount');
  previewTitle    = document.getElementById('previewTitle');
  previewCat      = document.getElementById('previewCat');
  previewCatEmoji = document.getElementById('previewCatEmoji');
  previewCatLabel = document.getElementById('previewCatLabel');
  previewDate     = document.getElementById('previewDate');
  previewNote     = document.getElementById('previewNote');
  previewBadge    = document.getElementById('previewBadge');

  amountInput?.addEventListener('input', updatePreview);
titleInput?.addEventListener('input', () => {
  clearFieldError('title', 'titleError');
  updatePreview();
});
dateInput?.addEventListener('input', () => {
  clearFieldError('date', 'dateError');
  updatePreview();
});
noteInput?.addEventListener('input', () => {
  updateCharCount();
  updatePreview();
});

/* ── Input real-time validation ───────────────────────────── */
titleInput?.addEventListener('blur', () => {
  if (titleInput.value.trim()) {
    clearFieldError('title', 'titleError');
    titleInput.classList.add('is-valid');
  }
});

dateInput?.addEventListener('blur', () => {
  if (dateInput.value) {
    clearFieldError('date', 'dateError');
    dateInput.classList.add('is-valid');
  }
});

amountInput?.addEventListener('blur', () => {
  const v = parseFloat(amountInput.value);
  if (!isNaN(v) && v > 0) {
    amountInput.classList.remove('is-invalid');
    amountInput.classList.add('is-valid');
  }
});

/* ── Keyboard shortcut: Ctrl/Cmd + Enter to submit ────────── */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    submitBtn?.click();
  }
});


  document.querySelectorAll('.ae-cat-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    // deselect all
    document.querySelectorAll('.ae-cat-chip').forEach(c => c.classList.remove('selected'));
    // select this
    chip.classList.add('selected');
    const val   = chip.dataset.value;
    const label = chip.dataset.label;
    const emoji = chip.querySelector('.ae-cat-emoji')?.textContent || '💸';
    categoryInput.value = val;
    selectedCatData = { val, label, emoji };
    clearFieldError('category', 'categoryError');
    updatePreview();
  });
});

  form?.addEventListener('submit', async e => {
  e.preventDefault();
  e.stopPropagation(); 

  if (!validateForm()) return;

  // Loading state
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {

    // Remove the hidden csrf_token from FormData to avoid conflicts
    // We send it only via header

    const formData = new FormData(form);


      const response = await fetch(form.action, {
          method: 'POST',
          body: formData,
          credentials: "same-origin"
      });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Invalid JSON response:", text);
      showToast("Server returned invalid response");
      return;
    }
    if (data.success) {
      showToast('✓ ' + (data.message || 'Expense added!'), 2600);
      resetForm();
      // Navigate after short delay
      if (data.redirect) {
        setTimeout(() => { window.location.href = data.redirect; }, 1200);
      }
    } else {
      // Server-side errors
      const errors = data.errors || ['Something went wrong.'];
      errors.forEach(err => showToast(err, 3000));
    }

  } catch (err) {
      console.error('Submit failed:', err);
      showToast("Request failed. Try again.");
  }finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});



  updatePreview();
  updateCharCount();
  amountInput?.focus();
  
});

// POPUP 

document.addEventListener("DOMContentLoaded", () => {
const saveCategoryBtn = document.getElementById("saveCategoryBtn");
if (!saveCategoryBtn) return;

saveCategoryBtn.addEventListener("click", async () => {

    const name = document
        .getElementById("customCategoryName")
        .value
        .trim();

    const icon = document
        .getElementById("customCategoryEmoji")
        .value
        .trim();

    if (!name) {
        alert("Category name required");
        return;
    }

    try {

      const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute('content');

    const response = await fetch("/create-category", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({
            name: name,
            icon: icon
        })
    });

    const text = await response.text();

    console.log(text);

    const data = JSON.parse(text);

    if (data.success) {

        addCategoryChip(data.category);

        document.getElementById("categoryModal")?.classList.remove("active");

        document.getElementById("customCategoryName").value = "";
        document.getElementById("customCategoryEmoji").value = "";

    } else {

        alert(data.message || "Something went wrong");

    }

    } catch (error) {

        console.error(error);

    }
  });  // ← closes saveCategoryBtn click
}); 

function addCategoryChip(category) {

    const grid = document.getElementById("categoryGrid");
    
    const customBtn = document.getElementById("openCustomCategory");

    const chip = document.createElement("button");

    chip.type = "button";

    chip.className = "ae-cat-chip selected";

    chip.dataset.value = category.id;
    chip.dataset.label = category.name;

    chip.innerHTML = `
        <span class="ae-cat-emoji">${category.icon || "✨"}</span>
        <span class="ae-cat-label">${category.name}</span>
        <span class="ae-cat-delete">×</span>
    `;

    // remove old selected state
    document.querySelectorAll(".ae-cat-chip")
        .forEach(btn => btn.classList.remove("selected"));

    // select new chip
    chip.classList.add("selected");

    // set hidden input
    categoryInput.value = category.id;

    // update selected category object
    selectedCatData = {
        val: category.id,
        label: category.name,
        emoji: category.icon || "✨"
    };

    // clear validation error
    clearFieldError("category", "categoryError");

    // update live preview
    updatePreview();

    // click listener for future selections
    chip.addEventListener("click", () => {

        document.querySelectorAll(".ae-cat-chip")
            .forEach(btn => btn.classList.remove("selected"));

        chip.classList.add("selected");

        categoryInput.value = category.id;

        selectedCatData = {
            val: category.id,
            label: category.name,
            emoji: category.icon || "✨"
        };

        clearFieldError("category", "categoryError");

        updatePreview();

    });

    // insert before custom button
    grid.appendChild(chip);
}

//DELETE CAT AJAX
document.addEventListener("click", async (e) => {

    const deleteBtn = e.target.closest(".ae-cat-delete");
    if (!deleteBtn) return;

    e.stopPropagation();

    const chip = deleteBtn.closest(".ae-cat-chip");
    const categoryId = parseInt(chip.dataset.value, 10);

    if (isNaN(categoryId)) {
        console.error("Broken category chip:", chip);
        showToast("Invalid category id");
        return;
    }

    if (!confirm("Delete this category?")) return;

    try {


        const categoryId = chip.dataset.value;

        if (!categoryId || isNaN(categoryId)) {
            console.error("Invalid chip:", chip);
            showToast("Invalid category selected");
            return;
        }
        const res = await fetch(`/delete-category/${categoryId}`, {
            method: "DELETE",
            headers: {
                "X-CSRFToken": document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute("content")
            }
        });

        const data = await res.json();

        if (data.success) {

            chip.remove();

            // reset selection if needed
            if (categoryInput.value == categoryId) {
                categoryInput.value = "";
                selectedCatData = null;
                updatePreview();
            }

            showToast("Category deleted 💀");

        } else {
            showToast(data.message || "Delete failed");
        }

    } catch (err) {
        console.error(err);
        showToast("Server error");
    }
});