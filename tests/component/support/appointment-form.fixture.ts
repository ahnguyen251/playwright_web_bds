export const appointmentFormFixture = (): string => `
  <main>
    <button type="button">Đặt lịch xem nhà</button>
    <section data-appointment-form>
      <h2>Đặt lịch xem nhà</h2>
      <p>Chọn ngày</p>
      <button type="button" aria-label="Thứ 4 12 Tháng 8" data-date-option>
        <span>Thứ 4</span><span>12</span><span>Tháng 8</span>
      </button>
      <button type="button" aria-label="Thứ 5 13 Tháng 8" data-date-option>
        <span>Thứ 5</span><span>13</span><span>Tháng 8</span>
      </button>
      <p>Chọn giờ</p>
      <button type="button" data-time-option>10:00 - 11:00</button>
      <input type="text" placeholder="Họ và tên *" />
      <p data-error="name" hidden>Vui lòng nhập họ và tên.</p>
      <input type="tel" placeholder="Số điện thoại *" />
      <p data-error="phone" hidden>Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (VD: 0901234567).</p>
      <input type="email" placeholder="Email *" />
      <p data-error="email" hidden>Email phải có đuôi @gmail.com.</p>
      <textarea placeholder="Ghi chú" maxlength="1000"></textarea>
      <button type="button" data-submit disabled>Đặt lịch ngay</button>
    </section>
    <section data-success hidden>
      <h3>Đặt lịch thành công!</h3>
    </section>
  </main>
  <script>
    const form = document.querySelector('[data-appointment-form]');
    const success = document.querySelector('[data-success]');
    const nameInput = document.querySelector('[placeholder="Họ và tên *"]');
    const phoneInput = document.querySelector('[placeholder="Số điện thoại *"]');
    const emailInput = document.querySelector('[placeholder="Email *"]');
    const submit = document.querySelector('[data-submit]');
    let selectedTime = false;

    const validPhone = () => /^0[235789]\\d{8}$/.test(phoneInput.value);
    const validEmail = () => /^[^@\\s]+@gmail\\.com$/i.test(emailInput.value.trim());
    const refreshSubmit = () => {
      submit.disabled = !(selectedTime && nameInput.value.trim() && validPhone() && validEmail());
    };

    nameInput.addEventListener('blur', () => {
      document.querySelector('[data-error="name"]').hidden = Boolean(nameInput.value.trim());
      refreshSubmit();
    });
    phoneInput.addEventListener('blur', () => {
      document.querySelector('[data-error="phone"]').hidden = validPhone();
      refreshSubmit();
    });
    emailInput.addEventListener('blur', () => {
      document.querySelector('[data-error="email"]').hidden = validEmail();
      refreshSubmit();
    });
    for (const input of [nameInput, phoneInput, emailInput]) {
      input.addEventListener('input', refreshSubmit);
    }
    for (const option of document.querySelectorAll('[data-time-option]')) {
      option.addEventListener('click', () => {
        selectedTime = true;
        refreshSubmit();
      });
    }
    submit.addEventListener('click', () => {
      if (!submit.disabled) {
        form.hidden = true;
        success.hidden = false;
      }
    });
  </script>
`;
