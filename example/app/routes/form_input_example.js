
const Constant = {
  Jobs: {
    "1": "manager",
    "2": "engineer",
    "3": "consultant",
    "4": "sales",
    "5": "planning",
    "6": "accounting",
    "7": "other",
  },

  InterestedIn: {
    "1": "business",
    "2": "politics",
    "3": "sports",
    "4": "music",
    "5": "movie",
    "6": "food",
    "7": "healthtech",
  },

  Month: {
    "1": "January",
    "2": "February",
    "3": "March",
    "4": "April",
    "5": "May",
    "6": "June",
    "7": "July",
    "8": "August",
    "9": "September",
    "10": "October",
    "11": "November",
    "12": "December",
  }
}

module.exports = {
  GET: {
    "/form_input_example": (req, res)=>{
      const profile = {
        email: req.body.email,
        name: req.body.name,
        password: req.body.password,
        passwordConfirmation: req.body.passwordConfirmation,
        sex: req.body.sex,
        birthMonth: req.body.birthMonth,
        job: req.body.job,
        interestedIn: req.body.interestedIn,
        selfIntroduction: req.body.selfIntroduction
      };
      res.renderLayout("/form_input_example/index", { Constant: Constant, profile: profile });
    },
    "/form_input_example/done": (req, res)=>{
      res.renderLayout("/form_input_example/done");
    },
  },
  POST: {
    "/form_input_confirm": (req, res)=>{
      const profile = {
        email: req.body.email,
        name: req.body.name,
        password: req.body.password,
        passwordConfirmation: req.body.passwordConfirmation,
        sex: req.body.sex,
        birthMonth: req.body.birthMonth,
        job: req.body.job,
        interestedIn: req.body.interestedIn,
        selfIntroduction: req.body.selfIntroduction
      };
      const messages = [];
      if(!profile.email){
        messages.push("Please enter your email.")
      }else{
        if(!profile.email.includes("@")){
          messages.push("Email is invalid format.")
        }
      }
      if(!profile.name){
        messages.push("Please enter your name.")
      }
      if(!profile.password){
        messages.push("Please enter password.")
      }else{
        if(profile.password != profile.passwordConfirmation){
          messages.push("Confirmation password does not match.")
        }
      }
      if(messages.length == 0){
        res.renderLayout("/form_input_example/confirm", {
          message: "Register with this input. Are you OK?", profile: profile, Constant: Constant
        });
      }else{
        res.renderLayout("/form_input_example/index", { message: messages.join("\n"), profile: profile, Constant: Constant });
      }
    },
    "/form_input": (req, res)=>{
      res.redirect("/form_input_example/done");
    },
  }
}
