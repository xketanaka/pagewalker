class DateFormat {
  static format(date, formatString){
    let [ yyyy, mm, dd, HH, MM, ss, SS ] = date.toISOString().split(/[-T:.]/);
    let replacement = { yyyy: yyyy, mm: mm, dd: dd, HH: HH, MM: MM, ss: ss, SS: SS };

    for(let key in replacement){
      formatString = formatString.replace(new RegExp(key), replacement[key])
    }
    return formatString;
  }
  static toTimepstampString(date){
    return this.format(date, 'yyyymmddHHMMss')
  }
  static toTimepstampMsecString(date){
    return this.format(date, 'yyyymmddHHMMssSS')
  }
}

module.exports = DateFormat;
