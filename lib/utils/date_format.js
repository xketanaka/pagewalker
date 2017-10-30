class DateFormat {
  static format(date, formatString){
    let [ yyyy, mm, dd, HH, MM, ss, ...rest ] = date.toISOString().split(/[-T:.]/);
    let replacement = { yyyy: yyyy, mm: mm, dd: dd, HH: HH, MM: MM, ss: ss };

    for(let key in replacement){
      formatString = formatString.replace(new RegExp(key), replacement[key])
    }
    return formatString;
  }
  static toTimepstampString(date){
    return this.format(date, 'yyyymmddHHMMss')
  }
}

module.exports = DateFormat;
