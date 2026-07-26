class SubtitleParser
{
    static parse(content, extension)
    {
        if (extension === 'srt' || extension === 'vtt')
        {
            return this.parseSRT(content);
        }
        return this.parseASS(content);
    }

    static timeToSeconds(timeStr)
    {
        const parts = timeStr.trim().replace(',', '.').split(':');
        if (parts.length === 3)
        {
            return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
        }
        return 0;
    }

    static assColorToHex(assColor)
    {
        const hex = assColor.replace(/&H|&/g, '');
        if (hex.length >= 6)
        {
            const r = hex.substring(hex.length - 2, hex.length);
            const g = hex.substring(hex.length - 4, hex.length - 2);
            const b = hex.substring(hex.length - 6, hex.length - 4);
            return `#${r}${g}${b}`;
        }
        return '#ffffff';
    }

    static parseSRT(content)
    {
        const lines = content.replace(/\r\n/g, '\n').split('\n\n');
        const subs = [];
        let idCounter = 0;
        for (const block of lines)
        {
            const parts = block.split('\n');
            if (parts.length >= 3)
            {
                const timeStr = parts[1].split(' --> ');
                if (timeStr.length === 2)
                {
                    subs.push
                    (
                        {
                            id: idCounter++,
                            start: this.timeToSeconds(timeStr[0]),
                            end: this.timeToSeconds(timeStr[1]),
                            text: parts.slice(2).join('<br>')
                        }
                    );
                }
            }
        }
        return subs;
    }

    static parseASS(content)
    {
        const lines = content.split('\n');
        const subs = [];
        const styles = {};
        let mode = '';
        let idCounter = 0;

        for (const line of lines)
        {
            const tline = line.trim();
            if (tline.startsWith('[V4+ Styles]')) { mode = 'styles'; continue; }
            if (tline.startsWith('[Events]')) { mode = 'events'; continue; }

            if (mode === 'styles' && tline.startsWith('Style:'))
            {
                const parts = tline.substring(6).split(',');
                if (parts.length > 7)
                {
                    styles[parts[0].trim()] =
                    {
                        fontName: parts[1].trim(),
                        fontSize: parseFloat(parts[2]),
                        primaryColor: this.assColorToHex(parts[3]),
                        secondaryColor: this.assColorToHex(parts[4]),
                        outlineColor: this.assColorToHex(parts[5]),
                        bold: parts[7] === '-1',
                        italic: parts[8] === '-1',
                        underline: parts[9] === '-1',
                        outline: parseFloat(parts[16] || 2)
                    };
                }
            }

            if (mode === 'events' && tline.startsWith('Dialogue:'))
            {
                const parts = tline.substring(10).split(',');
                if (parts.length >= 10)
                {
                    const start = this.timeToSeconds(parts[1]);
                    const end = this.timeToSeconds(parts[2]);
                    const styleName = parts[3].trim();
                    let text = parts.slice(9).join(',').trim();                    
                    let kDelay = 0;
                    text = text.replace(/\{\\[kK]f?([0-9]+)\}([^\{]*)/g, (match, time, word) =>
                    {
                        const duration = parseInt(time) * 10;
                        const span = `<span data-dur="${duration}" data-delay="${kDelay}">${word}</span>`;
                        kDelay += duration;
                        return span;
                    });
                    
                    text = text.replace(/\\N/g, '<br>').replace(/\{.*?\}/g, '');

                    subs.push
                    (
                        {
                            id: idCounter++,
                            start,
                            end,
                            text,
                            style: styles[styleName] || null
                        }
                    );
                }
            }
        }
        return subs;
    }
}