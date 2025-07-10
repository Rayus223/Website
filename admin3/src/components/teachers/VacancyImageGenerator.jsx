import React, { useRef, useEffect } from 'react';
import { Button, Tooltip, message } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';

// Import the background image - you'll need to adjust this path to point to where you store your image
// You can place it in public/images/ folder or in your src/assets/ folder
const BACKGROUND_IMAGE_URL = '/images/vacancy.png'; // Adjust this path as needed
const ICON_IMAGE_URL = '/images/vacancy icon.png'; // Path to the diamond icon

const VacancyImageGenerator = ({ vacancy }) => {
  const vacancyImageRef = useRef(null);
  const [generating, setGenerating] = React.useState(false);
  const hiddenDivRef = useRef(null);

  // Generate and download the image directly
  const generateAndDownload = () => {
    if (generating) return; // Prevent multiple clicks
    
    setGenerating(true);
    message.loading('Generating vacancy image...', 0);
    
    setTimeout(() => {
      if (hiddenDivRef.current) {
        html2canvas(hiddenDivRef.current, {
          useCORS: true,
          scale: 2, // Increase quality
          backgroundColor: null,
          logging: false,
        }).then((canvas) => {
          const link = document.createElement('a');
          // Format the filename using the vacancy title or a default
          const vacancyTitle = vacancy.title || 'Vacancy';
          const cleanTitle = vacancyTitle.replace(/vacancy\s*/i, '').trim();
          link.download = `${cleanTitle} - Vacancy.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          
          setGenerating(false);
          message.destroy();
          message.success('Vacancy image downloaded successfully!');
        }).catch(err => {
          console.error('Error generating image:', err);
          message.destroy();
          message.error('Failed to generate image');
          setGenerating(false);
        });
      }
    }, 100); // Small delay to ensure div is rendered
  };
  
  // Format gender requirement text
  const formatGenderRequirement = (gender) => {
    if (gender === 'male') {
      return 'Experienced male teachers are requested to apply.';
    } else if (gender === 'female') {
      return 'Experienced female teachers are requested to apply.';
    }
    return 'Experienced teachers are requested to apply.';
  };

  return (
    <>
      <Tooltip title="Download Vacancy Image">
        <Button 
          type="default"
          icon={
            <img 
              src={ICON_IMAGE_URL} 
              alt="Vacancy Icon" 
              style={{ width: '16px', height: '16px' }} 
            />
          }
          onClick={generateAndDownload}
          loading={generating}
          disabled={generating}
        />
      </Tooltip>
      
      {/* Hidden div for image generation - not visible to user */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div
          ref={hiddenDivRef}
          style={{
            width: '800px',
            height: '800px',
            position: 'relative',
          }}
        >
          {/* Background Image */}
          <img 
            src={BACKGROUND_IMAGE_URL} 
            alt="Vacancy Background" 
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              left: 0,
              top: 0,
              zIndex: 1
            }}
          />
          
          {/* Title text */}
          <div style={{
            position: 'absolute',
            top: '85px',
            left: '15px',
            color: 'white',
            fontSize: '32px',
            fontWeight: 'bold',
            width: '600px',
            zIndex: 2,
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            HOME TUITION TEACHER REQUIRED
          </div>
          
          {/* Location text */}
          <div style={{
            position: 'absolute',
            top: '185px',
            left: '15px',
            color: 'white',
            fontSize: '34px',
            fontWeight: 'bold',
            width: '700px',
            zIndex: 2,
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            Location : {vacancy.location || 'Kapan, Baluwakhani Chowk'}
          </div>
          
          {/* Class/Grade text */}
          <div style={{
            position: 'absolute',
            top: '285px',
            left: '15px',
            color: 'white',
            fontSize: '34px',
            fontWeight: 'bold',
            width: '200px',
            zIndex: 2,
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            Class : {vacancy.class || '5'}
          </div>
          
          {/* Salary text */}
          <div style={{
            position: 'absolute',
            top: '365px',
            left: '15px',
            color: 'white',
            fontSize: '34px',
            fontWeight: 'bold',
            width: '400px',
            zIndex: 2,
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            Salary : {vacancy.salary || '6 K / month'}
          </div>
          
          {/* Time text */}
          <div style={{
            position: 'absolute',
            top: '455px',
            left: '15px',
            color: 'white',
            fontSize: '34px',
            fontWeight: 'bold',
            width: '400px',
            zIndex: 2,
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            Time : {vacancy.time || '1 hr after 5:00 (evening)'}
          </div>
          
          {/* Phone text */}
          <div style={{
            position: 'absolute',
            top: '545px',
            left: '15px',
            color: 'white',
            fontSize: '34px',
            fontWeight: 'bold',
            width: '500px',
            zIndex: 2,
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            Gender : {vacancy.gender || 'Any'} 
          </div>
          
          {/* Subjects text */}
          <div style={{
            position: 'absolute',
            top: '655px',
            left: '15px',
            color: 'white',
            fontSize: '34px',
            fontWeight: 'bold',
            width: '500px',
            zIndex: 2,
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            Subjects : {vacancy.subjects || 'All Guidance'}
          </div>
          
          {/* Gender requirement box text */}
          <div style={{
            position: 'absolute',
            top: '260px',
            right: '-10px',
            color: 'white',
            fontSize: '36px',
            
            width: '350px',
            textAlign: 'center',
            zIndex: 2,
            lineHeight: '1.3',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            {formatGenderRequirement(vacancy.gender)}
          </div>
          
          {/* WhatsApp info box text */}
          <div style={{
            position: 'absolute',
            top: '410px',
            right: '0px',
            color: 'white',
            fontSize: '34px',
            fontWeight: 'bold',
            width: '350px',
            textAlign: 'center',
            zIndex: 2,
            lineHeight: '1.3',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            Send your CV via<br />
            WhatsApp<br />
            {vacancy.phone || '9846722600'}
          </div>
          
          {/* Vacancy NO text */}
          <div style={{
            position: 'absolute',
            top: '575px',
            right: '50px',
            color: 'white',
            fontSize: '32px',
            fontWeight: 'bold',
            width: '250px',
            textAlign: 'center',
            zIndex: 2,
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}>
            <div>: VACANCY NO :</div>
            <div style={{ fontSize: '36px', marginTop: '0px' }}>
              {(vacancy.title || 'NO TITLE').replace(/vacancy\s*/i, '')}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VacancyImageGenerator; 