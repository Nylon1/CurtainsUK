import { guidance } from './guidance.mjs';
const base = text=>({text,stage:'investigate',palette:[],patternDirection:'',textureDirection:'',alternatives:[],questions:[],nextSteps:[],evidenceIds:[],fabricIds:[]});
export function createMockProvider({failNext=false}={}) {
  let failure=failNext;
  return {kind:'mock',async respond({session,message,execute}) {
    if(failure){failure=false;throw Error('SIMULATED_PROVIDER_FAILURE');}
    const text=message.toLowerCase(),history=session.messages.filter(m=>m.role==='user').map(m=>m.text).join(' '),context=session.contexts.at(-1)?.value;
    const answer=base('Before choosing a fabric, let’s find the feeling you want. Which colours and larger furnishings are staying, and how much natural light does the room receive?');
    if(/ignore.*instruction|system prompt|supplier cost|wholesale|sql|service.role|api.key/.test(text)) return {...answer,text:'I can help with your room’s design, but I cannot disclose internal commercial information or change catalogue records. What would you like the room to feel like?'};
    if(/shambala/.test(text)){
      const {data}=await execute('search_retail_fabrics',{query:'Shambala',colour:'',pattern:''});
      return {...answer,text:data.length?'These are verified records returned by the existing customer catalogue. This reply is scripted, but the linked fabrics and images are real. Which colour direction would you like to compare? Check current price and availability in the product journey.':'No approved Shambala results were returned by this test source. That does not establish that the design is unavailable. We can still discuss your preferred colour and texture.',fabricIds:data.slice(0,4).map(f=>f.id),evidenceIds:data.slice(0,4).map(f=>f.provenance.id)};
    }
    if(/screenshot|upload|photograph|image attached/.test(text))return {...answer,text:'Screenshot processing is not connected in this development preview, so I cannot see an image. Describe the room colours and what feels wrong, or share the structured result fields with your permission.'};
    if(/exact.*colou?r|guarantee|match.*exact/.test(text)){await execute('get_tool_guidance',{tool:'samples'});return {...answer,text:'I cannot guarantee an exact colour match from a screen. A warm ivory may feel softer beside timber, but its undertone can shift with daylight and evening lamps. Compare physical samples against your walls and furnishings before deciding.',evidenceIds:[guidance.samples.id]};}
    if(/unavailable|discontinued|stock|price|delivery/.test(text))return {...answer,text:'I cannot confirm price, stock or delivery from this preview. A fabric record alone is not an offer for sale. We can still explore the colour, pattern and texture you like, then check a suitable option through the current product journey or human team.'};
    if(/fabric intelligence|recommendations|different results/.test(text)){
      await execute('get_tool_guidance',{tool:'fabric-intelligence'});
      return {...answer,text:'Fabric Intelligence helps turn your priorities and taste into a fabric direction. “Help me choose” starts with what matters most, such as privacy, softer daylight or mainly the look. You can add a reference image and refine the brief or give feedback on directions and fabrics. If the edit feels wrong, change the preference that caused it—such as pattern or colour—rather than changing everything together. Which part of the results feels least like you?',evidenceIds:[guidance['fabric-intelligence'].id]};
    }
    if((/visualiser|visualizer|results|too busy|patterns|patterned/.test(text)||context)&&!/cool|blue|changed my mind|instead|not warm/.test(text)){
      await execute('get_tool_guidance',{tool:'room-visualiser'});
      answer.evidenceIds=[guidance['room-visualiser'].id];answer.stage='refine';
      answer.text=`${context?.room?'In your '+({living:'living room',bedroom:'bedroom',lounge:'lounge',office:'office'}[context.room])+', ':''}if the patterns feel too busy, I’d reduce contrast before ruling out pattern altogether. Try a softly textured plain in warm ivory, or a small tonal motif with little difference between the ground and pattern. Keep the same room, view and lighting in the visualiser when comparing them. Is it the size of the pattern or the contrast that draws too much attention?`;
      answer.palette=['warm ivory','soft stone'];answer.patternDirection='Low-contrast tonal motif or a quiet plain';answer.textureDirection='Softly textured, matte surface';answer.alternatives=['Small tonal motif','Plain fabric with a subtle woven texture'];
    } else if(/cool|blue|changed my mind|instead|not warm/.test(text)){
      answer.stage='refine';answer.text='Let’s move away from the warmer direction. A softened blue-grey with a chalky neutral could feel calmer and cleaner; a muted sage is another route if blue feels too cool. Keep the surface matte and compare both against the furnishings that are staying. Which of those feels closer to your new direction?';answer.palette=['soft blue-grey','chalky neutral','muted sage'];answer.textureDirection='Matte, lightly woven texture';answer.patternDirection='Plain or a restrained tonal pattern';answer.alternatives=['Muted sage with a neutral ground'];
    } else if(/warm|contemporary|ivory|olive|oak|north|room|curtain/.test(text)){
      answer.stage='recommend';answer.text=`${/oak|timber/.test(text+' '+history)?'With the timber you mentioned, ':''}warm ivory is a useful starting point: it can soften the room without adding strong contrast. Muted olive is an alternative if you want more colour and a gentle connection to natural materials. I’d compare a softly woven plain with a restrained tonal geometric, keeping the pattern scale modest beside busy furnishings. What colour are the walls, and would you like the curtains to blend in or become a feature?`;answer.palette=['warm ivory','muted olive','soft stone'];answer.patternDirection='Restrained tonal geometric or textured plain';answer.textureDirection='Soft matte weave';answer.alternatives=['Muted olive for a stronger colour presence'];
    }
    if(/heading|wave|pleat/.test(text)) {await execute('get_tool_guidance',{tool:'curtain-style'});answer.text='Headings change the rhythm and silhouette of a curtain. The separate Curtain Style journey is the place to compare their appearance; the published Room Visualiser does not currently have a heading selector. Would you prefer a crisp, tailored line or a more relaxed gathered effect?';answer.evidenceIds=[guidance['curtain-style'].id];}
    if(/summar|finish|conclude/.test(text)){
      const last=session.messages.filter(m=>m.role==='assistant'&&m.advice?.palette.length).at(-1)?.advice;
      if(last)Object.assign(answer,{palette:last.palette,patternDirection:last.patternDirection,textureDirection:last.textureDirection,alternatives:last.alternatives});
      answer.stage='conclude';answer.text='Your direction so far is '+(answer.palette.length?answer.palette.join(', '):'still open—we need your room colours and preferred atmosphere')+'. '+(answer.patternDirection?answer.patternDirection+'. ':'')+'Compare the options in consistent light, then use physical samples in your own room. We can keep refining; ten minutes is a guide, not an ending.';
      answer.questions=['Which option feels closest to the atmosphere you want?'];
    }
    answer.nextSteps=['Compare one design variable at a time','View physical samples before a final colour decision'];
    return answer;
  }};
}
