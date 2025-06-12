const {page} = require('pagewalker');
const assert = require('assert');

describe("01.Form Input Example", ()=>{

  it("1. Load form input example page.", async ()=>{
    await page.load("http://localhost:3000");

    assert(await page.url, "http://localhost:3000");

    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("Form input").click();
    })
  })

  it("2. Input invalid value.", async () =>{

    assert(await page.find("input[name=sex]").first().attribute("type"), "radio");
    assert(await page.find("input[name=interestedIn]").first().attribute("type"), "checkbox");

    await page.find("input[name=email]").fillIn("abc.xyz.example.com");
    await page.find("input[name=name]").fillIn("");
    await page.find("input[name=password]").fillIn("password1");
    await page.find("input[name=passwordConfirmation]").fillIn("password2");
    await page.find("input[name=sex]").haveValue("1").chooseRadioButton();
    await page.find("input[name=sex]").haveValue("2").chooseRadioButton();
    await page.find("select[name=birthMonth]").choose("August");
    await page.find("select[name=job]").selectOption("sales");
    await page.find("select[name=job]").selectOption("engineer");
    await page.find("input[name=interestedIn]").haveValue("1").check();
    await page.find("input[name=interestedIn]").haveValue("2").check();
    await page.find("input[name=interestedIn]").haveValue("1").uncheck();
    await page.find("input[name=interestedIn]").haveValue("2").uncheck();
    await page.find("input[name=interestedIn]").haveValue("5").check();
    await page.find("input[name=interestedIn]").haveValue("6").check();
    await page.find("textarea[name=selfIntroduction]").setText(
      "Hello, my name is xketanaka. I come from Japan."
    );

    await page.waitForPageLoad(async ()=>{
      await page.find("button[type=submit]").haveText("submit").click();
    })
  });

  it("3. Assert validation error.", async () =>{
    assert(await page.find("div.message").find(elm => elm.textContent.includes("Please enter your email.") ).notExist());
    assert(await page.find("div.message").find(elm => elm.textContent.includes("Please enter your name.") ).exist());
    assert(await page.find("div.message").find(elm => elm.textContent.includes("Email is invalid format.") ).exist());
    assert(await page.find("div.message").find(elm => elm.textContent.includes("Confirmation password does not match.") ).exist());

    assert(await page.find("input[name=sex]").value(), "2")

    const checked = await page.find("input[name=interestedIn]").beChecked().toArray();
    assert(await page.find("input[name=interestedIn]").beChecked().count(), 2);
    assert(checked.length, 2);
    assert(await checked[0].value(), "5")
    assert(await checked[1].value(), "6")
    assert(await page.find("select[name=job] option").beSelected().content(), "engineer");
  });

  it("4. Input valid value.", async () =>{

    await page.find("input[name=email]").fillIn("abc.xyz@example.com");
    await page.find("input[name=name]").fillIn("xketanaka");
    await page.find("input[name=password]").fillIn("password.Ok");
    await page.find("input[name=passwordConfirmation]").fillIn("password.Ok");
    await page.find("select[name=job] option").haveText("manager").select();

    await page.waitForPageLoad(async ()=>{
      await page.find("button[type=submit]").haveText("submit").click();
    })
  });

  it("5. Assert values on confirmation.", async () =>{
    assert(await page.find("div.message").haveContent("Register with this input. Are you OK?").exist());
    assert.equal(await page.find("span.label").haveText("your email").parent().find("p").text(), "abc.xyz@example.com");
    assert.equal(await page.find("span.label").haveText("your name").parent().find("p").text(), "xketanaka");
    assert.equal(await page.find("span.label").haveText("password").parent().find("p").text(), "●●●●●●●●●●●");
    assert.equal(await page.find("span.label").haveText("sex").parent().find("p").text(), "female");
    assert.equal(await page.find("span.label").haveText("birthday month").parent().find("p").text(), "August");
    assert.equal(await page.find("span.label").haveText("your job").parent().find("p").text(), "manager");
    assert.equal(
      (await page.find("span.label").haveText("what interested in?").parent().find("p").text()).trim(),
      "movie, food"
    );
    assert.equal(
      (await page.find("span.label").haveText("self introduction").parent().find("p").text()).trim(),
      "Hello, my name is xketanaka. I come from Japan."
    );
  });

  it("6. registration success.", async () =>{
    await page.waitForPageLoad(async ()=>{
      await page.find("button[type=submit]").haveText("submit").click();
    })

    assert(await page.find("h1").haveText("Registration Completed").exist());
  });

  it("7. If object is missing, Failed or not.", async () => {
    assert(await page.url, "http://localhost:3000");
    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("Form input").click();
    })

    try {
      await page.find("input[name=missing]").fillIn("test");
      assert.fail("Should throw error, but not thrown.");
    }catch(e) {
      assert(e.message.includes("Element not found"));
    }

    try {
      await page.find("input[name=missing]").value();
    }catch(e) {
      assert.fail("should not throw error, but thrown.");
    }

    try {
      await page.find("button.missing").click();
      assert.fail("Should throw error, but not thrown.");
    }catch(e) {
      assert(e.message.includes("Element not found"));
    }

    try {
      await page.find("button.missing").exist();
    }catch(e) {
      assert.fail("should not throw error, but thrown.");
    }
  })
});
